const { query } = require('../../config/db');
const axios = require('axios');
const { aiUrl } = require('../../utils/aiUrl');

const AI_TIMEOUT = 30000;

// Get AI-generated learning path for user
const getLearningPath = async (req, res) => {
  const userId = req.user.id;

  // Get user's performance data
  const { rows: performance } = await query(
    `SELECT t.id, t.name, t.category, up.mastery_score, up.attempts
     FROM user_performance up
     JOIN topics t ON t.id = up.topic_id
     WHERE up.user_id = $1`,
    [userId]
  );

  const { rows: userInfo } = await query(
    'SELECT target_company, target_role, experience_level FROM users WHERE id = $1',
    [userId]
  );

  // Call adaptive learning AI service
  let recommendation;
  try {
    const { data } = await axios.post(
      `${aiUrl('AI_LEARNING_URL')}/recommend`,
      { user_id: userId, performance, user_info: userInfo[0] },
      { timeout: AI_TIMEOUT }
    );
    recommendation = data;
  } catch (err) {
    return res.status(502).json({ error: 'AI learning service is temporarily unavailable. Please try again.' });
  }

  // Upsert learning path
  const { rows: pathRows } = await query(
    `INSERT INTO learning_paths (user_id, name, target_company)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING RETURNING id`,
    [userId, `${userInfo[0]?.target_company || 'General'} Prep Path`, userInfo[0]?.target_company]
  );

  res.json({ recommendation, path_id: pathRows[0]?.id });
};

// Get next recommended question/topic
const getNextRecommendation = async (req, res) => {
  const userId = req.user.id;

  const { rows: weakTopics } = await query(
    `SELECT t.id, t.name, up.mastery_score
     FROM user_performance up
     JOIN topics t ON t.id = up.topic_id
     WHERE up.user_id = $1 AND up.mastery_score < 60
     ORDER BY up.mastery_score ASC LIMIT 3`,
    [userId]
  );

  const { rows: nextQuestions } = await query(
    `SELECT q.id, q.title, q.difficulty, q.type, t.name as topic
     FROM questions q
     JOIN topics t ON t.id = q.topic_id
     WHERE q.topic_id = ANY($1::int[])
       AND q.id NOT IN (
         SELECT question_id FROM interview_responses ir
         JOIN interview_sessions s ON s.id = ir.session_id
         WHERE s.user_id = $2
       )
     ORDER BY RANDOM() LIMIT 5`,
    [weakTopics.map((t) => t.id), userId]
  );

  res.json({ weak_topics: weakTopics, next_questions: nextQuestions });
};

// Generate study material for a topic
const generateStudyMaterial = async (req, res) => {
  const { topic_id, material_type = 'notes', company_target } = req.body;
  const userId = req.user.id;

  const { rows: topic } = await query('SELECT * FROM topics WHERE id = $1', [topic_id]);
  if (!topic[0]) return res.status(404).json({ error: 'Topic not found' });

  const { rows: userPerf } = await query(
    'SELECT mastery_score FROM user_performance WHERE user_id = $1 AND topic_id = $2',
    [userId, topic_id]
  );

  let material;
  try {
    const { data } = await axios.post(
      `${aiUrl('AI_LEARNING_URL')}/generate-material`,
      {
        topic: topic[0],
        material_type,
        company_target,
        user_level: userPerf[0]?.mastery_score || 50,
      },
      { timeout: AI_TIMEOUT }
    );
    material = data;
  } catch (err) {
    return res.status(502).json({ error: 'AI material generation is temporarily unavailable. Please try again.' });
  }

  const { rows } = await query(
    `INSERT INTO study_materials (user_id, topic_id, title, content, material_type, company_target)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [userId, topic_id, material.title, material.content, material_type, company_target]
  );

  res.json(rows[0]);
};

const getStudyMaterials = async (req, res) => {
  const { topic_id, type } = req.query;
  const params = [req.user.id];
  let filters = '';

  if (topic_id) { params.push(topic_id); filters += ` AND topic_id = $${params.length}`; }
  if (type) { params.push(type); filters += ` AND material_type = $${params.length}`; }

  const { rows } = await query(
    `SELECT sm.*, t.name as topic_name FROM study_materials sm
     LEFT JOIN topics t ON t.id = sm.topic_id
     WHERE (sm.user_id = $1 OR sm.user_id IS NULL) ${filters}
     ORDER BY sm.created_at DESC`,
    params
  );
  res.json(rows);
};

module.exports = { getLearningPath, getNextRecommendation, generateStudyMaterial, getStudyMaterials };
