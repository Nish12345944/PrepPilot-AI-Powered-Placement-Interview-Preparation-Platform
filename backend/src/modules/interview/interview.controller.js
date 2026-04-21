const { query } = require('../../config/db');
const axios = require('axios');
const redis = require('../../config/redis');

// Start a new interview session
const startSession = async (req, res) => {
  const { session_type, company_target, is_strict_mode, question_count = 10 } = req.body;
  const userId = req.user.id;

  // Fetch questions adapted to user level
  const cacheKey = `questions:${session_type}:${company_target || 'general'}`;
  let questions = await redis.get(cacheKey);

  if (!questions) {
    let queryText = `
      SELECT q.id, q.title, q.description, q.type, q.difficulty, q.options,
             q.time_limit_sec, q.xp_reward, q.hints
      FROM questions q
      WHERE q.type = $1
    `;
    const params = [session_type === 'technical' ? 'subjective' : session_type];

    if (company_target) {
      queryText += ` AND $2 = ANY(q.company_tags)`;
      params.push(company_target);
    }

    // Adaptive: weight by user's weak topics
    const { rows: perfRows } = await query(
      `SELECT t.name, up.mastery_score FROM user_performance up
       JOIN topics t ON t.id = up.topic_id
       WHERE up.user_id = $1 ORDER BY up.mastery_score ASC LIMIT 5`,
      [userId]
    );

    queryText += ` ORDER BY RANDOM() LIMIT $${params.length + 1}`;
    params.push(question_count);

    const { rows } = await query(queryText, params);
    questions = rows;
    await redis.set(cacheKey, questions, 300);
  }

  const { rows } = await query(
    `INSERT INTO interview_sessions (user_id, session_type, company_target, is_strict_mode, total_questions, status)
     VALUES ($1, $2, $3, $4, $5, 'active') RETURNING *`,
    [userId, session_type, company_target, is_strict_mode, questions.length]
  );

  res.status(201).json({ session: rows[0], questions });
};

// Submit a single response and get AI evaluation
const submitResponse = async (req, res) => {
  const { session_id, question_id, user_answer, time_taken_sec } = req.body;

  // Call AI evaluation service
  const { data: evaluation } = await axios.post(
    `${process.env.AI_INTERVIEW_URL}/evaluate`,
    { question_id, user_answer, session_type: req.body.session_type }
  );

  const { rows } = await query(
    `INSERT INTO interview_responses
       (session_id, question_id, user_answer, is_correct, score, time_taken_sec, ai_evaluation)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      session_id, question_id, user_answer,
      evaluation.is_correct, evaluation.score,
      time_taken_sec, JSON.stringify(evaluation)
    ]
  );

  // Award XP
  if (evaluation.score > 60) {
    await awardXP(req.user.id, Math.round(evaluation.score / 10), 'interview_response', rows[0].id);
  }

  res.json({ response: rows[0], evaluation });
};

// Complete session and get overall AI feedback
const completeSession = async (req, res) => {
  const { session_id } = req.params;
  const userId = req.user.id;

  const { rows: responses } = await query(
    `SELECT ir.*, q.title, q.topic_id FROM interview_responses ir
     JOIN questions q ON q.id = ir.question_id
     WHERE ir.session_id = $1`,
    [session_id]
  );

  const avgScore = responses.reduce((s, r) => s + parseFloat(r.score || 0), 0) / responses.length;

  // Get AI overall feedback
  const { data: feedback } = await axios.post(
    `${process.env.AI_INTERVIEW_URL}/session-feedback`,
    { responses, avg_score: avgScore }
  );

  const { rows } = await query(
    `UPDATE interview_sessions
     SET status = 'completed', score = $1, ai_feedback = $2,
         completed_at = NOW(), duration_sec = EXTRACT(EPOCH FROM (NOW() - started_at))
     WHERE id = $3 AND user_id = $4 RETURNING *`,
    [avgScore, JSON.stringify(feedback), session_id, userId]
  );

  // Update user performance per topic
  await updateTopicPerformance(userId, responses);

  // Check streak
  await updateStreak(userId);

  res.json({ session: rows[0], feedback });
};

const getSessions = async (req, res) => {
  const { page = 1, limit = 10, type } = req.query;
  const offset = (page - 1) * limit;

  let queryText = `
    SELECT id, session_type, company_target, status, score, duration_sec,
           total_questions, created_at, completed_at
    FROM interview_sessions WHERE user_id = $1
  `;
  const params = [req.user.id];

  if (type) {
    queryText += ` AND session_type = $2`;
    params.push(type);
  }

  queryText += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const { rows } = await query(queryText, params);
  res.json(rows);
};

// Helper: update topic mastery after session
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
    const avgTime = data.times.length ? data.times.reduce((a, b) => a + b, 0) / data.times.length : null;
    const masteryDelta = ((data.correct / data.total) * 100 - 50) * 0.1; // incremental update

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

const updateStreak = async (userId) => {
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
};

const awardXP = async (userId, amount, reason, referenceId) => {
  await query(
    'INSERT INTO xp_transactions (user_id, amount, reason, reference_id) VALUES ($1, $2, $3, $4)',
    [userId, amount, reason, referenceId]
  );
  await query(
    'UPDATE user_profiles SET total_xp = total_xp + $1, level = GREATEST(1, (total_xp + $1) / 500 + 1) WHERE user_id = $2',
    [amount, userId]
  );
};

module.exports = { startSession, submitResponse, completeSession, getSessions };
