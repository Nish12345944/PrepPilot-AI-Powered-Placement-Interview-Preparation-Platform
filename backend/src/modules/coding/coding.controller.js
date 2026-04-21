const { query } = require('../../config/db');
const axios = require('axios');

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
     LEFT JOIN code_submissions cs ON cs.problem_id = q.id AND cs.user_id = $1
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
    `SELECT q.*, cp.starter_code, cp.test_cases, cp.constraints, cp.examples,
            cp.time_complexity, cp.space_complexity, t.name as topic_name
     FROM questions q
     JOIN coding_problems cp ON cp.question_id = q.id
     JOIN topics t ON t.id = q.topic_id
     WHERE q.id = $1`,
    [req.params.id]
  );

  if (!rows[0]) return res.status(404).json({ error: 'Problem not found' });

  // Hide hidden test cases
  const problem = rows[0];
  problem.test_cases = problem.test_cases.filter((tc) => !tc.is_hidden);
  res.json(problem);
};

// Submit code for judging
const submitCode = async (req, res) => {
  const { problem_id, language, code } = req.body;
  const userId = req.user.id;

  // Get test cases (including hidden)
  const { rows: problems } = await query(
    'SELECT cp.test_cases, q.id FROM coding_problems cp JOIN questions q ON q.id = cp.question_id WHERE cp.question_id = $1',
    [problem_id]
  );

  if (!problems[0]) return res.status(404).json({ error: 'Problem not found' });

  // Call AI service for code execution + analysis
  const { data: judgeResult } = await axios.post(
    `${process.env.AI_INTERVIEW_URL}/judge`,
    { code, language, test_cases: problems[0].test_cases }
  );

  const { rows } = await query(
    `INSERT INTO code_submissions
       (user_id, problem_id, language, code, status, test_results, runtime_ms, memory_kb, ai_feedback)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      userId, problem_id, language, code,
      judgeResult.status, JSON.stringify(judgeResult.test_results),
      judgeResult.runtime_ms, judgeResult.memory_kb,
      JSON.stringify(judgeResult.ai_feedback)
    ]
  );

  if (judgeResult.status === 'accepted') {
    await query(
      `UPDATE user_profiles SET total_xp = total_xp + 20 WHERE user_id = $1`,
      [userId]
    );
  }

  res.json(rows[0]);
};

const getSubmissions = async (req, res) => {
  const { problem_id } = req.params;
  const { rows } = await query(
    `SELECT id, language, status, runtime_ms, memory_kb, submitted_at
     FROM code_submissions WHERE user_id = $1 AND problem_id = $2
     ORDER BY submitted_at DESC LIMIT 10`,
    [req.user.id, problem_id]
  );
  res.json(rows);
};

module.exports = { getProblems, getProblemById, submitCode, getSubmissions };
