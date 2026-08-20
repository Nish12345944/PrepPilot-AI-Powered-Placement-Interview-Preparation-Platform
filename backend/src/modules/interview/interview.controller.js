const { query } = require('../../config/db');
const axios = require('axios');
const redis = require('../../config/redis');
const multer = require('multer');
const { awardXP, evaluateBadgeAwards } = require('../gamification/gamification.controller');

const AI_URL = () => process.env.AI_INTERVIEW_URL;
const AI_TIMEOUT = 30000;

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav', 'video/webm'];
    cb(null, allowed.includes(file.mimetype) || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/'));
  },
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const updateStreak = async (userId) => {
  try {
    await query(
      `UPDATE user_profiles SET
         current_streak = CASE
           WHEN last_active::date = CURRENT_DATE - 1 THEN current_streak + 1
           WHEN last_active::date = CURRENT_DATE THEN current_streak
           ELSE 1
         END,
         longest_streak = GREATEST(longest_streak,
           CASE WHEN last_active::date = CURRENT_DATE - 1 THEN current_streak + 1 ELSE 1 END),
         last_active = NOW()
       WHERE user_id = $1`,
      [userId]
    );
  } catch (_) {}
};

const updateTopicPerformance = async (userId, responses) => {
  const topicMap = {};
  for (const r of responses) {
    if (!r.topic_id) continue;
    if (!topicMap[r.topic_id]) topicMap[r.topic_id] = { correct: 0, total: 0, times: [] };
    topicMap[r.topic_id].total++;
    if (r.is_correct) topicMap[r.topic_id].correct++;
    if (r.time_taken_sec) topicMap[r.topic_id].times.push(r.time_taken_sec);
  }
  for (const [topicId, data] of Object.entries(topicMap)) {
    const avgTime = data.times.length
      ? data.times.reduce((a, b) => a + b, 0) / data.times.length
      : null;
    const masteryDelta = ((data.correct / data.total) * 100 - 50) * 0.1;
    await query(
      `INSERT INTO user_performance (user_id, topic_id, attempts, correct, avg_time_sec, mastery_score)
       VALUES ($1, $2, $3, $4, $5, GREATEST(0, LEAST(100, 50 + $6)))
       ON CONFLICT (user_id, topic_id) DO UPDATE SET
         attempts = user_performance.attempts + $3,
         correct = user_performance.correct + $4,
         mastery_score = GREATEST(0, LEAST(100, user_performance.mastery_score + $6)),
         last_attempted = NOW()`,
      [userId, topicId, data.total, data.correct, avgTime, masteryDelta]
    );
  }
};

// Fallback questions when DB has none
const FALLBACK_QUESTIONS = {
  technical: [
    { id: 'fb-1', title: 'Explain OOP principles', description: 'Describe the four pillars of Object-Oriented Programming with examples.', type: 'subjective', difficulty: 'medium', time_limit_sec: 300, xp_reward: 10, hints: ['Think: Encapsulation, Inheritance, Polymorphism, Abstraction'] },
    { id: 'fb-2', title: 'What is a hash table?', description: 'Explain how hash tables work, including collision resolution strategies.', type: 'subjective', difficulty: 'medium', time_limit_sec: 300, xp_reward: 10, hints: ['Consider: hash function, chaining, open addressing'] },
    { id: 'fb-3', title: 'Explain REST vs GraphQL', description: 'Compare REST and GraphQL APIs. When would you choose one over the other?', type: 'subjective', difficulty: 'medium', time_limit_sec: 300, xp_reward: 10, hints: [] },
    { id: 'fb-4', title: 'What is a deadlock?', description: 'Explain deadlock in operating systems and how to prevent it.', type: 'subjective', difficulty: 'medium', time_limit_sec: 300, xp_reward: 10, hints: [] },
    { id: 'fb-5', title: 'Explain database indexing', description: 'What is database indexing? How does it improve query performance? What are the trade-offs?', type: 'subjective', difficulty: 'medium', time_limit_sec: 300, xp_reward: 10, hints: [] },
  ],
  hr: [
    { id: 'fb-6', title: 'Tell me about yourself', description: 'Give a brief professional introduction covering your background, skills, and career goals.', type: 'behavioral', difficulty: 'easy', time_limit_sec: 240, xp_reward: 10, hints: ['Use the Present-Past-Future structure'] },
    { id: 'fb-7', title: 'Describe a challenge you overcame', description: 'Tell me about a difficult situation at work or school and how you handled it.', type: 'behavioral', difficulty: 'medium', time_limit_sec: 300, xp_reward: 10, hints: ['Use the STAR method: Situation, Task, Action, Result'] },
    { id: 'fb-8', title: 'Why do you want this role?', description: 'What motivates you to apply for this position? How does it align with your goals?', type: 'behavioral', difficulty: 'easy', time_limit_sec: 240, xp_reward: 10, hints: [] },
    { id: 'fb-9', title: 'Describe your greatest strength', description: 'What is your biggest professional strength and how have you applied it?', type: 'behavioral', difficulty: 'easy', time_limit_sec: 240, xp_reward: 10, hints: [] },
    { id: 'fb-10', title: 'Where do you see yourself in 5 years?', description: 'Describe your career aspirations and how this role fits into your long-term plan.', type: 'behavioral', difficulty: 'easy', time_limit_sec: 240, xp_reward: 10, hints: [] },
  ],
  aptitude: [
    { id: 'fb-11', title: 'Speed & Distance Problem', description: 'A train travels 360 km in 4 hours. Another train travels the same distance in 3 hours. What is the ratio of their speeds?', type: 'mcq', difficulty: 'easy', time_limit_sec: 120, xp_reward: 10, hints: ['Speed = Distance / Time'] },
    { id: 'fb-12', title: 'Logical Sequence', description: 'Find the next number in the sequence: 2, 6, 12, 20, 30, ?', type: 'mcq', difficulty: 'easy', time_limit_sec: 120, xp_reward: 10, hints: ['Look at the differences between consecutive terms'] },
    { id: 'fb-13', title: 'Probability', description: 'A bag contains 5 red and 3 blue balls. What is the probability of drawing 2 red balls without replacement?', type: 'subjective', difficulty: 'medium', time_limit_sec: 180, xp_reward: 10, hints: [] },
    { id: 'fb-14', title: 'Profit & Loss', description: 'A shopkeeper buys an item for ₹800 and sells it for ₹1000. What is the profit percentage?', type: 'mcq', difficulty: 'easy', time_limit_sec: 120, xp_reward: 10, hints: ['Profit% = (Profit/Cost Price) × 100'] },
    { id: 'fb-15', title: 'Coding-Decoding', description: 'If APPLE is coded as BQQMF, how is MANGO coded?', type: 'mcq', difficulty: 'easy', time_limit_sec: 120, xp_reward: 10, hints: ['Each letter is shifted by 1 position'] },
  ],
  coding: [
    { id: 'fb-16', title: 'Two Sum', description: 'Given an array of integers and a target sum, return the indices of two numbers that add up to the target. Assume exactly one solution exists.', type: 'coding', difficulty: 'easy', time_limit_sec: 600, xp_reward: 20, hints: ['Consider using a hash map for O(n) solution'] },
    { id: 'fb-17', title: 'Reverse a String', description: 'Write a function to reverse a string without using built-in reverse methods.', type: 'coding', difficulty: 'easy', time_limit_sec: 300, xp_reward: 10, hints: ['Use two pointers'] },
    { id: 'fb-18', title: 'FizzBuzz', description: 'Print numbers 1 to 100. For multiples of 3 print "Fizz", for multiples of 5 print "Buzz", for multiples of both print "FizzBuzz".', type: 'coding', difficulty: 'easy', time_limit_sec: 300, xp_reward: 10, hints: [] },
    { id: 'fb-19', title: 'Check Palindrome', description: 'Write a function that checks if a given string is a palindrome (ignoring spaces and case).', type: 'coding', difficulty: 'easy', time_limit_sec: 300, xp_reward: 10, hints: ['Compare characters from both ends'] },
    { id: 'fb-20', title: 'Find Maximum Subarray', description: 'Given an integer array, find the contiguous subarray with the largest sum and return its sum. (Kadane\'s Algorithm)', type: 'coding', difficulty: 'medium', time_limit_sec: 600, xp_reward: 20, hints: ['Track current sum and max sum as you iterate'] },
  ],
};

// ── Controllers ───────────────────────────────────────────────────────────────

const getCompanies = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, name, difficulty, focus_areas,
              (SELECT COUNT(*) FROM company_questions cq WHERE cq.company_id = c.id) as question_count
       FROM companies c ORDER BY
         CASE difficulty WHEN 'easy' THEN 1 WHEN 'medium' THEN 2 WHEN 'hard' THEN 3 END, name`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getQuestionsByCompany = async (req, res) => {
  try {
    const { company, difficulty, type, limit = 10 } = req.query;
    let queryText = `SELECT q.id, q.title, q.description, q.type, q.difficulty,
                            q.company_tags, q.options, q.time_limit_sec, q.xp_reward
                     FROM questions q WHERE 1=1`;
    const params = [];
    if (company) { queryText += ` AND $${params.length + 1} = ANY(q.company_tags)`; params.push(company); }
    if (difficulty) { queryText += ` AND q.difficulty = $${params.length + 1}`; params.push(difficulty); }
    if (type) { queryText += ` AND q.type = $${params.length + 1}`; params.push(type); }
    queryText += ` ORDER BY q.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));
    const { rows } = await query(queryText, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const startSession = async (req, res) => {
  try {
    const { session_type, company_target, is_strict_mode, question_count = 10 } = req.body;
    const userId = req.user.id;

    // Map session_type to question type
    const typeMap = { technical: 'subjective', hr: 'behavioral', aptitude: 'mcq', coding: 'coding' };
    const qType = typeMap[session_type] || 'subjective';

    const cacheKey = `questions:${session_type}:${company_target || 'general'}:${question_count}`;
    let questions = await redis.get(cacheKey);

    if (!questions) {
      let queryText = `SELECT q.id, q.title, q.description, q.type, q.difficulty,
                              q.options, q.time_limit_sec, q.xp_reward, q.hints,
                              q.correct_answer, q.topic_id
                       FROM questions q WHERE q.type = $1`;
      const params = [qType];

      if (company_target && company_target !== 'General') {
        queryText += ` AND $${params.length + 1} = ANY(q.company_tags)`;
        params.push(company_target);
      }

      queryText += ` ORDER BY RANDOM() LIMIT $${params.length + 1}`;
      params.push(parseInt(question_count));

      const { rows } = await query(queryText, params);
      questions = rows;

      // Use fallback questions if DB has none
      if (!questions.length) {
        const pool = FALLBACK_QUESTIONS[session_type] || FALLBACK_QUESTIONS.technical;
        questions = pool.slice(0, parseInt(question_count));
      }

      if (questions.length) await redis.set(cacheKey, questions, 300);
    }

    const { rows } = await query(
      `INSERT INTO interview_sessions
         (user_id, session_type, company_target, is_strict_mode, total_questions, status, started_at)
       VALUES ($1, $2, $3, $4, $5, 'active', NOW()) RETURNING *`,
      [userId, session_type, company_target, is_strict_mode, questions.length]
    );

    // Return questions in body (not URL) — strip correct_answer from client payload
    const clientQuestions = questions.map(({ correct_answer, ...q }) => q);
    res.status(201).json({ session: rows[0], questions: clientQuestions });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to start session' });
  }
};

const submitResponse = async (req, res) => {
  try {
    const { session_id } = req.params;
    const { question_id, user_answer, time_taken_sec, session_type } = req.body;

    if (!user_answer?.trim()) return res.status(400).json({ error: 'Answer cannot be empty' });

    // Fetch question details for AI context
    const { rows: qRows } = await query(
      'SELECT id, title, description, type, correct_answer, hints FROM questions WHERE id = $1',
      [question_id]
    );
    const question = qRows[0];

    // Call AI evaluation with full context
    let evaluation;
    try {
      const { data } = await axios.post(
        `${AI_URL()}/evaluate`,
        {
          question_id,
          user_answer,
          session_type: session_type || 'technical',
          question_title: question?.title || '',
          question_description: question?.description || '',
          correct_answer: question?.correct_answer || '',
        },
        { timeout: AI_TIMEOUT }
      );
      evaluation = data;
    } catch (aiErr) {
      // Graceful fallback evaluation
      evaluation = {
        score: 50, is_correct: false,
        accuracy: 50, clarity: 50, structure: 50,
        keywords_matched: [],
        feedback: 'AI evaluation service is temporarily unavailable. Your answer has been recorded.',
        optimized_answer: question?.correct_answer || '',
      };
    }

    const { rows } = await query(
      `INSERT INTO interview_responses
         (session_id, question_id, user_answer, is_correct, score, time_taken_sec, ai_evaluation)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        session_id, question_id, user_answer,
        evaluation.is_correct, evaluation.score,
        time_taken_sec, JSON.stringify(evaluation),
      ]
    );

    if (evaluation.score > 60) {
      await awardXP(req.user.id, Math.round(evaluation.score / 10), 'interview_response', rows[0].id);
    }

    res.json({ response: rows[0], evaluation });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to submit response' });
  }
};

const completeSession = async (req, res) => {
  try {
    const { session_id } = req.params;
    const userId = req.user.id;

    // Verify session belongs to user
    const { rows: sessionRows } = await query(
      'SELECT * FROM interview_sessions WHERE id = $1 AND user_id = $2',
      [session_id, userId]
    );
    if (!sessionRows[0]) return res.status(404).json({ error: 'Session not found' });
    if (sessionRows[0].status === 'completed') {
      return res.json({ session: sessionRows[0], feedback: sessionRows[0].ai_feedback || {} });
    }

    const { rows: responses } = await query(
      `SELECT ir.*, q.title, q.topic_id FROM interview_responses ir
       JOIN questions q ON q.id = ir.question_id
       WHERE ir.session_id = $1`,
      [session_id]
    );

    // Handle fallback questions (no DB question record)
    const { rows: allResponses } = await query(
      'SELECT * FROM interview_responses WHERE session_id = $1',
      [session_id]
    );

    const avgScore = allResponses.length
      ? allResponses.reduce((s, r) => s + parseFloat(r.score || 0), 0) / allResponses.length
      : 0;

    let feedback;
    try {
      const { data } = await axios.post(
        `${AI_URL()}/session-feedback`,
        {
          responses: allResponses.map((r) => ({
            title: r.title || 'Question',
            score: r.score,
            feedback: typeof r.ai_evaluation === 'string'
              ? JSON.parse(r.ai_evaluation || '{}').feedback
              : r.ai_evaluation?.feedback,
          })),
          avg_score: avgScore,
        },
        { timeout: AI_TIMEOUT }
      );
      feedback = data;
    } catch (_) {
      feedback = {
        overall_assessment: `You completed the session with an average score of ${Math.round(avgScore)}/100.`,
        strengths: avgScore >= 70 ? ['Good overall performance', 'Consistent answers'] : ['Completed all questions'],
        areas_to_improve: avgScore < 70 ? ['Review core concepts', 'Practice more questions'] : ['Aim for deeper explanations'],
        recommended_topics: [],
        next_steps: ['Review your answers', 'Practice daily', 'Try a harder session'],
      };
    }

    const { rows: updated } = await query(
      `UPDATE interview_sessions
       SET status = 'completed', score = $1, ai_feedback = $2,
           completed_at = NOW(),
           duration_sec = EXTRACT(EPOCH FROM (NOW() - COALESCE(started_at, created_at)))::int
       WHERE id = $3 AND user_id = $4 RETURNING *`,
      [avgScore, JSON.stringify(feedback), session_id, userId]
    );

    await updateTopicPerformance(userId, responses);
    await updateStreak(userId);
    await awardXP(userId, Math.round(avgScore / 5), 'interview_session_complete', session_id);
    // Evaluate badge awards after completing session
    await evaluateBadgeAwards(userId);

    res.json({ session: updated[0], feedback });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to complete session' });
  }
};

const getSessions = async (req, res) => {
  try {
    const { page = 1, limit = 10, type } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let queryText = `SELECT id, session_type, company_target, status, score, duration_sec,
                            total_questions, created_at, completed_at
                     FROM interview_sessions WHERE user_id = $1`;
    const params = [req.user.id];
    if (type) { queryText += ` AND session_type = $2`; params.push(type); }
    queryText += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);
    const { rows } = await query(queryText, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getSessionDetail = async (req, res) => {
  try {
    const { session_id } = req.params;
    const { rows: sessions } = await query(
      'SELECT * FROM interview_sessions WHERE id = $1 AND user_id = $2',
      [session_id, req.user.id]
    );
    if (!sessions[0]) return res.status(404).json({ error: 'Session not found' });

    const { rows: responses } = await query(
      `SELECT ir.*, q.title, q.description, q.difficulty, q.type
       FROM interview_responses ir
       LEFT JOIN questions q ON q.id = ir.question_id
       WHERE ir.session_id = $1 ORDER BY ir.created_at ASC`,
      [session_id]
    );

    const parsed = responses.map((r) => ({
      ...r,
      ai_evaluation: typeof r.ai_evaluation === 'string'
        ? JSON.parse(r.ai_evaluation || '{}')
        : r.ai_evaluation,
    }));

    res.json({
      session: {
        ...sessions[0],
        ai_feedback: typeof sessions[0].ai_feedback === 'string'
          ? JSON.parse(sessions[0].ai_feedback || '{}')
          : sessions[0].ai_feedback,
      },
      responses: parsed,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const transcribeAudio = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file uploaded' });

    const FormData = require('form-data');
    const form = new FormData();
    form.append('audio', req.file.buffer, {
      filename: `audio.${req.file.mimetype.includes('ogg') ? 'ogg' : req.file.mimetype.includes('wav') ? 'wav' : 'webm'}`,
      contentType: req.file.mimetype,
    });
    form.append('language', req.body.language || 'en');

    const { data } = await axios.post(
      `${AI_URL()}/transcribe`,
      form,
      { headers: form.getHeaders(), timeout: 30000 }
    );
    res.json(data);
  } catch (err) {
    const msg = err.response?.data?.detail || err.message || 'Transcription failed';
    res.status(err.response?.status || 500).json({ error: msg });
  }
};

module.exports = {
  startSession, submitResponse, completeSession,
  getSessions, getSessionDetail,
  getCompanies, getQuestionsByCompany,
  transcribeAudio, audioUpload,
};
