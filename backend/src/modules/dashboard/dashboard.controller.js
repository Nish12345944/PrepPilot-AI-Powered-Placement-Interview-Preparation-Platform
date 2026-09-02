const { query } = require('../../config/db');
const { safeErrorMessage } = require('../../middleware/errorHandler');

const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    const [profile, recentSessions, topicPerf, streakData, recentBadges, weakTopics] =
      await Promise.all([
        query(
          `SELECT u.full_name, u.target_company, p.total_xp, p.level,
                  p.current_streak, p.longest_streak
           FROM users u JOIN user_profiles p ON p.user_id = u.id WHERE u.id = $1`,
          [userId]
        ),
        query(
          `SELECT session_type, score, status, created_at
           FROM interview_sessions WHERE user_id = $1
           ORDER BY created_at DESC LIMIT 5`,
          [userId]
        ),
        query(
          `SELECT t.name, t.category, up.mastery_score, up.attempts, up.correct
           FROM user_performance up JOIN topics t ON t.id = up.topic_id
           WHERE up.user_id = $1 ORDER BY up.mastery_score DESC`,
          [userId]
        ),
        query(
          `SELECT DATE(created_at) as date, SUM(amount) as xp_earned
           FROM xp_transactions WHERE user_id = $1
             AND created_at > NOW() - INTERVAL '30 days'
           GROUP BY DATE(created_at) ORDER BY date`,
          [userId]
        ),
        query(
          `SELECT b.name, b.description, b.icon_url, ub.earned_at
           FROM user_badges ub JOIN badges b ON b.id = ub.badge_id
           WHERE ub.user_id = $1 ORDER BY ub.earned_at DESC LIMIT 5`,
          [userId]
        ),
        query(
          `SELECT t.name, up.mastery_score
           FROM user_performance up JOIN topics t ON t.id = up.topic_id
           WHERE up.user_id = $1 AND up.mastery_score < 50
           ORDER BY up.mastery_score ASC LIMIT 5`,
          [userId]
        ),
      ]);

    const totalSolved = await query(
      `SELECT COUNT(DISTINCT problem_id) as count FROM code_submissions
       WHERE user_id = $1 AND status = 'accepted'`,
      [userId]
    );

    const sessionsCompleted = await query(
      `SELECT COUNT(*) as count FROM interview_sessions
       WHERE user_id = $1 AND status = 'completed'`,
      [userId]
    );

    res.json({
      profile: profile.rows[0],
      stats: {
        problems_solved: parseInt(totalSolved.rows[0]?.count || 0),
        sessions_completed: parseInt(sessionsCompleted.rows[0]?.count || 0),
      },
      recent_sessions: recentSessions.rows,
      topic_performance: topicPerf.rows,
      xp_history: streakData.rows,
      recent_badges: recentBadges.rows,
      weak_topics: weakTopics.rows,
    });
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
};

const getLeaderboard = async (req, res) => {
  try {
    const { period = 'weekly' } = req.query;

    // Whitelist allowed periods to prevent SQL injection
    const allowedPeriods = { weekly: '7 days', monthly: '30 days', all_time: '999 years' };
    const interval = allowedPeriods[period] || allowedPeriods.weekly;

    const { rows } = await query(
      `SELECT u.full_name, u.avatar_url, SUM(x.amount) as xp,
              RANK() OVER (ORDER BY SUM(x.amount) DESC) as rank
       FROM xp_transactions x JOIN users u ON u.id = x.user_id
       WHERE x.created_at > NOW() - $1::interval
       GROUP BY u.id, u.full_name, u.avatar_url
       ORDER BY xp DESC LIMIT 50`,
      [interval]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: safeErrorMessage(err) });
  }
};

module.exports = { getDashboard, getLeaderboard };
