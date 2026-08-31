const { query } = require('../../config/db');
const axios = require('axios');
const { awardXP, evaluateBadgeAwards } = require('../gamification/gamification.controller');
const { aiUrl } = require('../../utils/aiUrl');

const AI_TIMEOUT = 30000;

// `pg` returns JSONB/JSON columns as strings; normalise them before returning.
const parseJson = (value, fallback) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch (_) { return fallback; }
  }
  return value;
};

// Get problems with adaptive difficulty
const getProblems = async (req, res) => {
  const { topic, difficulty, company, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const params = [req.user.id];
  let filters = '';

  if (topic) { params.push(topic); filters += ` AND t.name ILIKE $${params.length}`; }
  if (difficulty) { params.push(difficulty); filters += ` AND q.difficulty = $${params.length}`; }
  if (company) { params.push(company); filters += ` AND $${params.length} = ANY(q.company_tags)`; }

  const { rows } = await query(
    `SELECT q.id, q.title, q.difficulty, q.company_tags, q.xp_reward,
            t.name as topic_name,
            cs.status as user_status,
            up.mastery_score
     FROM questions q
     JOIN topics t ON t.id = q.topic_id
     LEFT JOIN coding_problems cp2 ON cp2.question_id = q.id
     LEFT JOIN code_submissions cs ON cs.problem_id = cp2.id AND cs.user_id = $1
       AND cs.status = 'accepted'
     LEFT JOIN user_performance up ON up.topic_id = q.topic_id AND up.user_id = $1
     WHERE q.type = 'coding' ${filters}
     ORDER BY
       CASE q.difficulty WHEN 'easy' THEN 1 WHEN 'medium' THEN 2 WHEN 'hard' THEN 3 END,
       COALESCE(up.mastery_score, 50) ASC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  res.json(rows);
};

const getProblemById = async (req, res) => {
  const { rows } = await query(
    `SELECT q.id, q.title, q.description, q.type, q.difficulty, q.company_tags,
            q.role_tags, q.options, q.time_limit_sec, q.xp_reward, q.hints,
            q.topic_id, q.created_at,
            cp.starter_code, cp.test_cases, cp.constraints, cp.examples,
            cp.time_complexity, cp.space_complexity, t.name as topic_name
     FROM questions q
     JOIN coding_problems cp ON cp.question_id = q.id
     JOIN topics t ON t.id = q.topic_id
     WHERE q.id = $1`,
    [req.params.id]
  );

  if (!rows[0]) return res.status(404).json({ error: 'Problem not found' });

  const problem = {
    ...rows[0],
    starter_code: parseJson(rows[0].starter_code, {}),
    test_cases: parseJson(rows[0].test_cases, []),
    constraints: parseJson(rows[0].constraints, null),
    examples: parseJson(rows[0].examples, []),
    options: parseJson(rows[0].options, []),
  };

  // Hide hidden test cases from the client
  problem.test_cases = problem.test_cases.filter((tc) => !tc.is_hidden);
  res.json(problem);
};

// Submit code for judging
const submitCode = async (req, res) => {
  const { problem_id, language, code } = req.body;
  const userId = req.user.id;

  if (!problem_id || !language || !code?.trim()) {
    return res.status(400).json({ error: 'problem_id, language and code are required' });
  }

  // Get test cases (including hidden) — problem_id is questions.id from frontend
  const { rows: problems } = await query(
    'SELECT cp.id as cp_id, cp.test_cases FROM coding_problems cp WHERE cp.question_id = $1',
    [problem_id]
  );

  if (!problems[0]) return res.status(404).json({ error: 'Problem not found' });

  let judgeResult;
  try {
    const { data } = await axios.post(
      `${aiUrl('AI_INTERVIEW_URL')}/judge`,
      { code, language, test_cases: parseJson(problems[0].test_cases, []) },
      { timeout: AI_TIMEOUT }
    );
    judgeResult = data;
  } catch (err) {
    return res.status(err.response?.status === 400 ? 400 : 502).json({
      error: 'Code execution service unavailable. Please try again.',
    });
  }

  const testResults = parseJson(judgeResult.test_results, []);
  const aiFeedback = parseJson(judgeResult.ai_feedback, null);
  const passed = testResults.filter((t) => t.passed).length;
  const total = testResults.length;

  const cpId = problems[0].cp_id;

  const { rows } = await query(
    `INSERT INTO code_submissions
       (user_id, problem_id, language, code, status, test_results, runtime_ms, memory_kb, ai_feedback)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      userId, cpId, language, code,
      judgeResult.status, JSON.stringify(testResults),
      judgeResult.runtime_ms, judgeResult.memory_kb,
      JSON.stringify(aiFeedback),
    ]
  );

  if (judgeResult.status === 'accepted') {
    await awardXP(userId, 20, 'coding_problem_solved', rows[0].id);
    await evaluateBadgeAwards(userId);
  }

  res.json({
    ...rows[0],
    test_results: testResults,
    ai_feedback: aiFeedback,
    passed,
    total,
    compile_error: judgeResult.compile_error || null,
  });
};

const getSubmissions = async (req, res) => {
  const { problem_id } = req.params; // this is questions.id
  const { rows } = await query(
    `SELECT cs.id, cs.language, cs.status, cs.runtime_ms, cs.memory_kb, cs.submitted_at
     FROM code_submissions cs
     JOIN coding_problems cp ON cp.id = cs.problem_id
     WHERE cs.user_id = $1 AND cp.question_id = $2
     ORDER BY cs.submitted_at DESC LIMIT 10`,
    [req.user.id, problem_id]
  );
  res.json(rows);
};

const getHint = async (req, res) => {
  const { problem_id, code, language, error, wrong_cases, hint_level } = req.body;

  const { rows } = await query(
    'SELECT q.title, q.description FROM questions q WHERE q.id = $1',
    [problem_id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Problem not found' });

  const { data } = await axios.post(`${aiUrl('AI_INTERVIEW_URL')}/hint`, {
    code, language,
    problem_title: rows[0].title,
    problem_description: rows[0].description,
    error: error || null,
    wrong_cases: wrong_cases || [],
    hint_level: hint_level || 1,
  }, { timeout: AI_TIMEOUT });
  res.json(data);
};

module.exports = { getProblems, getProblemById, submitCode, getSubmissions, getHint };
