const { query } = require('../../config/db');
const { getIO } = require('../../utils/socket');

// Get user notifications (paginated)
const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [countResult, rowsResult] = await Promise.all([
      query(
        'SELECT COUNT(*) as total FROM notifications WHERE user_id = $1',
        [req.user.id]
      ),
      query(
        `SELECT id, title, body, type, is_read, metadata, created_at
         FROM notifications
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [req.user.id, parseInt(limit), offset]
      ),
    ]);

    // Parse metadata
    const notifications = rowsResult.rows.map((n) => ({
      ...n,
      metadata: typeof n.metadata === 'string' ? JSON.parse(n.metadata || '{}') : n.metadata,
    }));

    res.json({
      notifications,
      total: parseInt(countResult.rows[0]?.total || 0),
      page: parseInt(page),
      limit: parseInt(limit),
      has_more: offset + notifications.length < parseInt(countResult.rows[0]?.total || 0),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get unread notification count (for badge/socket)
const getUnreadCount = async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ unread_count: parseInt(rows[0]?.count || 0) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mark a notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `UPDATE notifications SET is_read = TRUE
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Notification not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mark all notifications as read
const markAllRead = async (req, res) => {
  try {
    await query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a notification (used internally)
const createNotification = async (
  userId,
  title,
  body,
  type = 'system',
  metadata = null
) => {
  try {
    const { rows } = await query(
      `INSERT INTO notifications (user_id, title, body, type, metadata)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, title, body, type, metadata ? JSON.stringify(metadata) : null]
    );

    // Emit real-time via Socket.IO if available
    const io = getIO();
    if (io) {
      io.to(`user:${userId}`).emit('notification', rows[0]);
    }
    return rows[0];
  } catch (err) {
    console.error('Notification creation failed:', err.message);
    return null;
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllRead,
  createNotification,
};
