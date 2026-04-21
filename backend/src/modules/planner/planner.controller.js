const { query } = require('../../config/db');
const axios = require('axios');

// Auto-generate daily plan using AI
const generateDailyPlan = async (req, res) => {
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0];

  // Check if plan already exists
  const { rows: existing } = await query(
    'SELECT * FROM daily_plans WHERE user_id = $1 AND plan_date = $2',
    [userId, today]
  );
  if (existing[0]) return res.json(existing[0]);

  // Get user context for AI
  const { rows: perf } = await query(
    `SELECT t.name, up.mastery_score FROM user_performance up
     JOIN topics t ON t.id = up.topic_id
     WHERE up.user_id = $1 ORDER BY up.mastery_score ASC LIMIT 10`,
    [userId]
  );

  const { rows: userInfo } = await query(
    'SELECT target_company, target_role FROM users WHERE id = $1',
    [userId]
  );

  const { rows: yesterday } = await query(
    `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as done
     FROM plan_tasks pt JOIN daily_plans dp ON dp.id = pt.plan_id
     WHERE dp.user_id = $1 AND dp.plan_date = $2`,
    [userId, new Date(Date.now() - 86400000).toISOString().split('T')[0]]
  );

  const { data: plan } = await axios.post(
    `${process.env.AI_LEARNING_URL}/generate-plan`,
    {
      user_id: userId,
      weak_topics: perf,
      user_info: userInfo[0],
      yesterday_completion: yesterday[0],
    }
  );

  const { rows: planRow } = await query(
    `INSERT INTO daily_plans (user_id, plan_date, total_tasks)
     VALUES ($1, $2, $3) RETURNING *`,
    [userId, today, plan.tasks.length]
  );

  // Insert tasks
  const taskInserts = plan.tasks.map((task, i) =>
    query(
      `INSERT INTO plan_tasks (plan_id, title, description, task_type, topic_id, duration_min, order_index)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [planRow[0].id, task.title, task.description, task.type, task.topic_id, task.duration_min, i]
    )
  );
  await Promise.all(taskInserts);

  const { rows: tasks } = await query(
    'SELECT * FROM plan_tasks WHERE plan_id = $1 ORDER BY order_index',
    [planRow[0].id]
  );

  res.status(201).json({ plan: planRow[0], tasks });
};

const getTodayPlan = async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const { rows: plan } = await query(
    'SELECT * FROM daily_plans WHERE user_id = $1 AND plan_date = $2',
    [req.user.id, today]
  );

  if (!plan[0]) return res.json(null);

  const { rows: tasks } = await query(
    'SELECT * FROM plan_tasks WHERE plan_id = $1 ORDER BY order_index',
    [plan[0].id]
  );

  res.json({ plan: plan[0], tasks });
};

const updateTaskStatus = async (req, res) => {
  const { task_id } = req.params;
  const { status } = req.body;

  const { rows } = await query(
    `UPDATE plan_tasks SET status = $1, completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE NULL END
     WHERE id = $2 RETURNING *`,
    [status, task_id]
  );

  if (!rows[0]) return res.status(404).json({ error: 'Task not found' });

  // Update plan completion count
  await query(
    `UPDATE daily_plans SET completed_tasks = (
       SELECT COUNT(*) FROM plan_tasks WHERE plan_id = $1 AND status = 'completed'
     ) WHERE id = $1`,
    [rows[0].plan_id]
  );

  res.json(rows[0]);
};

module.exports = { generateDailyPlan, getTodayPlan, updateTaskStatus };
