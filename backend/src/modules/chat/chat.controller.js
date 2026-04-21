const { query } = require('../../config/db');
const axios = require('axios');

// Send message to AI Copilot
const sendMessage = async (req, res) => {
  const { session_id, message } = req.body;
  const userId = req.user.id;

  let chatSessionId = session_id;

  // Create new session if not provided
  if (!chatSessionId) {
    const { rows } = await query(
      `INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING id`,
      [userId, message.substring(0, 50)]
    );
    chatSessionId = rows[0].id;
  }

  // Save user message
  await query(
    'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)',
    [chatSessionId, 'user', message]
  );

  // Get conversation history (last 10 messages for context)
  const { rows: history } = await query(
    `SELECT role, content FROM chat_messages
     WHERE session_id = $1 ORDER BY created_at DESC LIMIT 10`,
    [chatSessionId]
  );

  // Get user context for personalized responses
  const { rows: userCtx } = await query(
    `SELECT u.target_company, u.target_role, p.weak_topics, p.skills, p.level
     FROM users u JOIN user_profiles p ON p.user_id = u.id WHERE u.id = $1`,
    [userId]
  );

  // Call AI Copilot service
  const { data: aiResponse } = await axios.post(
    `${process.env.AI_COPILOT_URL}/chat`,
    {
      message,
      history: history.reverse(),
      user_context: userCtx[0],
    }
  );

  // Save AI response
  const { rows: savedMsg } = await query(
    `INSERT INTO chat_messages (session_id, role, content, metadata)
     VALUES ($1, 'assistant', $2, $3) RETURNING *`,
    [chatSessionId, aiResponse.response, JSON.stringify({ intent: aiResponse.intent, tokens: aiResponse.tokens_used })]
  );

  res.json({
    session_id: chatSessionId,
    message: savedMsg[0],
    intent: aiResponse.intent,
  });
};

const getSessions = async (req, res) => {
  const { rows } = await query(
    `SELECT cs.id, cs.title, cs.created_at,
            (SELECT content FROM chat_messages WHERE session_id = cs.id ORDER BY created_at DESC LIMIT 1) as last_message
     FROM chat_sessions cs WHERE cs.user_id = $1 ORDER BY cs.created_at DESC LIMIT 20`,
    [req.user.id]
  );
  res.json(rows);
};

const getMessages = async (req, res) => {
  const { session_id } = req.params;
  const { rows } = await query(
    `SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC`,
    [session_id]
  );
  res.json(rows);
};

module.exports = { sendMessage, getSessions, getMessages };
