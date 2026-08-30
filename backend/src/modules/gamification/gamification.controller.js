const { query } = require('../../config/db');

// ── Badge Evaluation Engine ───────────────────────────────────────────────────

const BADGE_CRITERIA = {
  'interviews_completed': async (userId, threshold) => {
    const { rows } = await query(
      `SELECT COUNT(*) as count FROM interview_sessions
       WHERE user_id = $1 AND status = 'completed'`,
      [userId]
    );
    return parseInt(rows[0]?.count || 0) >= threshold;
  },
  'current_streak': async (userId, threshold) => {
    const { rows } = await query(
      'SELECT current_streak FROM user_profiles WHERE user_id = $1',
      [userId]
    );
    return parseInt(rows[0]?.current_streak || 0) >= threshold;
  },
  'problems_solved': async (userId, threshold) => {
    const { rows } = await query(
      `SELECT COUNT(DISTINCT problem_id) as count FROM code_submissions
       WHERE user_id = $1 AND status = 'accepted'`,
      [userId]
    );
    return parseInt(rows[0]?.count || 0) >= threshold;
  },
  'session_accuracy': async (userId, threshold) => {
    const { rows } = await query(
      `SELECT AVG(score) as avg_score FROM interview_sessions
       WHERE user_id = $1 AND status = 'completed'`,
      [userId]
    );
    return parseFloat(rows[0]?.avg_score || 0) >= threshold;
  },
  'hard_problem_time': async (userId, threshold) => {
    const { rows } = await query(
      `SELECT cs.runtime_ms FROM code_submissions cs
       JOIN coding_problems cp ON cp.id = cs.problem_id
       JOIN questions q ON q.id = cp.question_id
       WHERE cs.user_id = $1 AND cs.status = 'accepted' AND q.difficulty = 'hard'
       ORDER BY cs.runtime_ms ASC LIMIT 1`,
      [userId]
    );
    return parseInt(rows[0]?.runtime_ms || 999999) <= threshold;
  },
  'tasks_completed': async (userId, threshold) => {
    const { rows } = await query(
      `SELECT COUNT(*) as count FROM plan_tasks pt
       JOIN daily_plans dp ON dp.id = pt.plan_id
       WHERE dp.user_id = $1 AND pt.status = 'completed'`,
      [userId]
    );
    return parseInt(rows[0]?.count || 0) >= threshold;
  },
  'study_materials': async (userId, threshold) => {
    const { rows } = await query(
      'SELECT COUNT(*) as count FROM study_materials WHERE user_id = $1',
      [userId]
    );
    return parseInt(rows[0]?.count || 0) >= threshold;
  },
};

// Evaluate and award badges for a user
const evaluateBadgeAwards = async (userId) => {
  try {
    const { rows: badges } = await query('SELECT id, name, criteria FROM badges');
    const { rows: earned } = await query(
      'SELECT badge_id FROM user_badges WHERE user_id = $1',
      [userId]
    );
    const earnedIds = new Set(earned.map((e) => e.badge_id));
    const newlyAwarded = [];

    for (const badge of badges) {
      if (earnedIds.has(badge.id)) continue;
      const criteria = typeof badge.criteria === 'string'
        ? JSON.parse(badge.criteria)
        : badge.criteria;
      const metric = criteria?.metric;
      const threshold = parseInt(criteria?.threshold || 1);

      const evaluator = BADGE_CRITERIA[metric];
      if (!evaluator) continue;

      if (await evaluator(userId, threshold)) {
        await query(
          `INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [userId, badge.id]
        );
        newlyAwarded.push(badge);
      }
    }

    if (newlyAwarded.length) {
      // Award XP per badge with a stable reference so the UNIQUE(reason, reference_id)
      // constraint protects against duplicate rewards under concurrent evaluation.
      for (const badge of newlyAwarded) {
        await awardXP(userId, 50, 'badge_earned', `badge:${badge.id}`);
        // Send notification for each new badge
        await query(
          `INSERT INTO notifications (user_id, title, body, type, metadata)
           VALUES ($1, 'New Badge Earned!', $2, 'achievement', $3)`,
          [userId, `You earned the "${badge.name}" badge!`, JSON.stringify({ badge_id: badge.id })]
        );
      }
    }
    return newlyAwarded;
  } catch (err) {
    console.error('Badge evaluation failed:', err.message);
    return [];
  }
};

// ── XP Utilities ──────────────────────────────────────────────────────────────

const awardXP = async (userId, amount, reason, referenceId = null) => {
  if (!userId || !amount || amount <= 0) return;
  try {
    // Prevent duplicate XP reward for same reference
    if (referenceId) {
      const { rows } = await query(
        'SELECT id FROM xp_transactions WHERE user_id = $1 AND reason = $2 AND reference_id = $3',
        [userId, reason, referenceId]
      );
      if (rows[0]) return; // Already awarded
    }

    await query(
      `INSERT INTO xp_transactions (user_id, amount, reason, reference_id)
       VALUES ($1, $2, $3, $4)`,
      [userId, amount, reason, referenceId]
    );

    await query(
      `UPDATE user_profiles SET
         total_xp = total_xp + $1,
         level = GREATEST(1, FLOOR((total_xp + $1) / 500) + 1)
       WHERE user_id = $2`,
      [amount, userId]
    );

    // Check if user leveled up for notification
    const { rows: profile } = await query(
      'SELECT level, total_xp FROM user_profiles WHERE user_id = $1',
      [userId]
    );
    if (profile[0]) {
      const newLevel = Math.floor(profile[0].total_xp / 500) + 1;
      if (newLevel > (global.prevLevels?.[userId] || 0)) {
        await query(
          `INSERT INTO notifications (user_id, title, body, type, metadata)
           VALUES ($1, 'Level Up!', $2, 'achievement', $3)`,
          [userId, `You reached Level ${newLevel}!`, JSON.stringify({ level: newLevel })]
        );
      }
      global.prevLevels = global.prevLevels || {};
      global.prevLevels[userId] = newLevel;
    }
  } catch (err) {
    console.error('XP award failed:', err.message);
  }
};

const getAchievements = async (req, res) => {
  try {
    const [badges, stats] = await Promise.all([
      query(
        `SELECT b.*, ub.earned_at,
                (ub.user_id IS NOT NULL) as earned
         FROM badges b
         LEFT JOIN user_badges ub ON ub.badge_id = b.id AND ub.user_id = $1
         ORDER BY b.id`,
        [req.user.id]
      ),
      query(
        `SELECT
           (SELECT COUNT(*) FROM interview_sessions WHERE user_id = $1 AND status = 'completed') as interviews,
           (SELECT COUNT(DISTINCT problem_id) FROM code_submissions WHERE user_id = $1 AND status = 'accepted') as problems,
           (SELECT current_streak FROM user_profiles WHERE user_id = $1) as streak,
           (SELECT COUNT(*) FROM plan_tasks pt JOIN daily_plans dp ON dp.id = pt.plan_id
             WHERE dp.user_id = $1 AND pt.status = 'completed') as tasks,
           (SELECT COUNT(*) FROM study_materials WHERE user_id = $1) as materials`,
        [req.user.id]
      ),
    ]);

    // Enrich badges with progress info
    const progressMap = {
      'interviews_completed': parseInt(stats.rows[0]?.interviews || 0),
      'current_streak': parseInt(stats.rows[0]?.streak || 0),
      'problems_solved': parseInt(stats.rows[0]?.problems || 0),
      'tasks_completed': parseInt(stats.rows[0]?.tasks || 0),
      'study_materials': parseInt(stats.rows[0]?.materials || 0),
    };

    const result = badges.rows.map((b) => {
      const criteria = typeof b.criteria === 'string' ? JSON.parse(b.criteria) : b.criteria;
      const current = progressMap[criteria?.metric] ?? null;
      const threshold = parseInt(criteria?.threshold || 1);
      return {
        id: b.id,
        name: b.name,
        description: b.description,
        icon_url: b.icon_url,
        type: b.type,
        earned: b.earned,
        earned_at: b.earned_at,
        progress: current !== null ? Math.min(100, Math.round((current / threshold) * 100)) : 0,
        current,
        threshold,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { awardXP, evaluateBadgeAwards, getAchievements };