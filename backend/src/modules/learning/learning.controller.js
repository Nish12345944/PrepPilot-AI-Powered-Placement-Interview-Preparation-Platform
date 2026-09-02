const { query } = require('../../config/db');
const axios = require('axios');
const { aiUrl } = require('../../utils/aiUrl');
const { safeErrorMessage } = require('../../middleware/errorHandler');

const AI_TIMEOUT = 30000;

const getLearningPath = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's weak topics and learning preferences
    const { rows: weakTopics } = await query(
      `SELECT t.name, t.category, up.mastery_score
       FROM user_performance up
       JOIN topics t ON t.id = up.topic_id
       WHERE up.user_id = $1 AND up.mastery_score < 60
       ORDER BY up.mastery_score ASC LIMIT 10`,
      [userId]
    );

    const { rows: userInfo } = await query(
      'SELECT target_company, target_role, experience_level FROM users WHERE id = $1',
      [userId]
    );

    // Get recommended study materials
    const { rows: materials } = await query(
      `SELECT sm.id, sm.title, sm.type, sm.url, sm.duration_min, t.name as topic_name
       FROM study_materials sm
       JOIN topics t ON t.id = sm.topic_id
       WHERE sm.topic_id IN (SELECT topic_id FROM user_performance WHERE user_id = $1 AND mastery_score < 60)
       ORDER BY sm.created_at DESC LIMIT 20`,
      [userId]
    );

    res.json({
      weak_topics: weakTopics,
      user_info: userInfo[0] || null,
      recommended_materials: materials,
    });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
};

const getNextRecommendation = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get the user's weakest topic
    const { rows: weakTopics } = await query(
      `SELECT t.id, t.name, t.category, up.mastery_score
       FROM user_performance up
       JOIN topics t ON t.id = up.topic_id
       WHERE up.user_id = $1
       ORDER BY up.mastery_score ASC LIMIT 1`,
      [userId]
    );

    if (!weakTopics[0]) {
      return res.json({ recommendation: null, message: 'No weak topics found. Great job!' });
    }

    // Get study materials for the weakest topic
    const { rows: materials } = await query(
      `SELECT sm.id, sm.title, sm.type, sm.url, sm.duration_min
       FROM study_materials sm
       WHERE sm.topic_id = $1
       ORDER BY sm.created_at DESC LIMIT 5`,
      [weakTopics[0].id]
    );

    // Get a practice question for the topic
    const { rows: questions } = await query(
      `SELECT q.id, q.title, q.type, q.difficulty, q.time_limit_sec
       FROM questions q
       WHERE q.topic_id = $1 AND q.type = 'coding'
       ORDER BY RANDOM() LIMIT 1`,
      [weakTopics[0].id]
    );

    res.json({
      topic: weakTopics[0],
      study_materials: materials,
      practice_question: questions[0] || null,
    });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
};

const generateStudyMaterial = async (req, res) => {
  try {
    const userId = req.user.id;
    const { topic_id, topic_name } = req.body;

    if (!topic_id && !topic_name) {
      return res.status(400).json({ error: 'topic_id or topic_name is required' });
    }

    // Resolve topic
    let topic;
    if (topic_id) {
      const { rows } = await query('SELECT * FROM topics WHERE id = $1', [topic_id]);
      topic = rows[0];
    } else {
      const { rows } = await query('SELECT * FROM topics WHERE name ILIKE $1 LIMIT 1', [topic_name]);
      topic = rows[0];
    }

    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    // Get user context
    const { rows: userInfo } = await query(
      'SELECT target_company, target_role, experience_level FROM users WHERE id = $1',
      [userId]
    );

    // Generate study material via AI
    let content;
    try {
      const { data } = await axios.post(
        `${aiUrl('AI_LEARNING_URL')}/generate-material`,
        {
          topic: topic.name,
          category: topic.category,
          user_context: userInfo[0] || null,
        },
        { timeout: AI_TIMEOUT }
      );
      content = data;
    } catch (err) {
      return res.status(502).json({ error: 'AI service unavailable. Please try again.' });
    }

    // Save generated material
    const { rows } = await query(
      `INSERT INTO study_materials (user_id, topic_id, title, type, content, duration_min)
       VALUES ($1, $2, $3, 'generated', $4, $5) RETURNING *`,
      [userId, topic.id, content.title || `Study Guide: ${topic.name}`, JSON.stringify(content), content.duration_min || 30]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
};

const getStudyMaterials = async (req, res) => {
  try {
    const { topic, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [req.user.id];
    let filter = '';

    if (topic) {
      params.push(topic);
      filter = ` AND t.name ILIKE $${params.length}`;
    }

    const { rows } = await query(
      `SELECT sm.id, sm.title, sm.type, sm.url, sm.duration_min, sm.created_at, t.name as topic_name
       FROM study_materials sm
       JOIN topics t ON t.id = sm.topic_id
       WHERE sm.user_id = $1${filter}
       ORDER BY sm.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
};

module.exports = { getLearningPath, getNextRecommendation, generateStudyMaterial, getStudyMaterials };
