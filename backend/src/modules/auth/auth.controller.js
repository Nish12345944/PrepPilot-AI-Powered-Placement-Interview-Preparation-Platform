const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { query } = require('../../config/db');
const redis = require('../../config/redis');
const logger = require('../../utils/logger');

// Build a mailer only if SMTP is configured; otherwise gracefully skip sending
// (reset requests still return the generic success message to avoid enumeration).
const mailer = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
  : null;

const generateTokens = (userId) => {
  // Defaults matter: without them jwt.sign gets expiresIn: undefined and
  // tokens NEVER expire. Render/local .env should also set these explicitly.
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
  return { accessToken, refreshToken };
};

const register = async (req, res) => {
  const { email, password, full_name, target_company, target_role, college, graduation_year } = req.body;

  const passwordHash = await bcrypt.hash(password, 12);

  const { rows } = await query(
    `INSERT INTO users (email, password_hash, full_name, target_company, target_role, college, graduation_year)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, full_name, role`,
    [email, passwordHash, full_name, target_company, target_role, college, graduation_year]
  );

  const user = rows[0];

  // Create default profile
  await query('INSERT INTO user_profiles (user_id) VALUES ($1)', [user.id]);

  const { accessToken, refreshToken } = generateTokens(user.id);

  // Store refresh token hash
  const tokenHash = await bcrypt.hash(refreshToken, 8);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [user.id, tokenHash, expiresAt]
  );

  res.status(201).json({ user, accessToken, refreshToken });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  const { rows } = await query(
    'SELECT id, email, password_hash, full_name, role FROM users WHERE email = $1',
    [email]
  );

  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const { accessToken, refreshToken } = generateTokens(user.id);

  const tokenHash = await bcrypt.hash(refreshToken, 8);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [user.id, tokenHash, expiresAt]
  );

  // Update last active
  await query('UPDATE user_profiles SET last_active = NOW() WHERE user_id = $1', [user.id]);

  const { password_hash, ...safeUser } = user;
  res.json({ user: safeUser, accessToken, refreshToken });
};

const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const { rows } = await query(
      'SELECT * FROM refresh_tokens WHERE user_id = $1 AND expires_at > NOW()',
      [decoded.userId]
    );

    // Verify against stored hashes
    let validToken = null;
    for (const row of rows) {
      if (await bcrypt.compare(refreshToken, row.token_hash)) {
        validToken = row;
        break;
      }
    }

    if (!validToken) return res.status(401).json({ error: 'Invalid refresh token' });

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);

    // Rotate refresh token
    await query('DELETE FROM refresh_tokens WHERE id = $1', [validToken.id]);
    const newHash = await bcrypt.hash(newRefreshToken, 8);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [decoded.userId, newHash, expiresAt]
    );

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

const logout = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    // Blacklist current access token until expiry
    await redis.set(`blacklist:${token}`, '1', 900); // 15 min TTL
  }
  // Revoke all refresh tokens for user
  await query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);
  res.json({ message: 'Logged out successfully' });
};

const getMe = async (req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.email, u.full_name, u.role, u.target_company, u.target_role,
            u.college, u.graduation_year, u.avatar_url,
            p.total_xp, p.level, p.current_streak, p.skills, p.weak_topics
     FROM users u
     LEFT JOIN user_profiles p ON p.user_id = u.id
     WHERE u.id = $1`,
    [req.user.id]
  );
  res.json(rows[0]);
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  const { rows } = await query('SELECT id FROM users WHERE email = $1', [email]);
  // Always respond 200 to prevent email enumeration
  if (!rows[0]) return res.json({ message: 'If that email exists, a reset link has been sent.' });

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = await bcrypt.hash(token, 8);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [rows[0].id, tokenHash, expiresAt]
  );

  const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}&id=${rows[0].id}`;

  // Best-effort email — always return the generic message so we don't leak
  // account existence or crash if SMTP is down.
  if (mailer) {
    try {
      await mailer.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'PrepPilot – Reset your password',
        html: `<p>Click the link below to reset your password. It expires in 1 hour.</p>
               <a href="${resetUrl}">${resetUrl}</a>
               <p>If you didn't request this, ignore this email.</p>`,
      });
        } catch (err) {
      // Log server-side only; never expose the token or full reset URL.
      logger.error('Password reset email failed:', err.message);
    }
  } else {
    // SMTP is not configured — surface a log line for operators without leaking the token.
    logger.warn(`SMTP not configured; password reset link requested for user ${rows[0].id}`);
  }

  res.json({ message: 'If that email exists, a reset link has been sent.' });
};

const resetPassword = async (req, res) => {
  const { userId, token, password } = req.body;

  const { rows } = await query(
    `SELECT * FROM password_reset_tokens
     WHERE user_id = $1 AND expires_at > NOW() AND used = FALSE`,
    [userId]
  );

  let validRow = null;
  for (const row of rows) {
    if (await bcrypt.compare(token, row.token_hash)) { validRow = row; break; }
  }

  if (!validRow) return res.status(400).json({ error: 'Invalid or expired reset link.' });

  const passwordHash = await bcrypt.hash(password, 12);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
  await query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [validRow.id]);
  // Revoke all refresh tokens so old sessions are invalidated
  await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);

  res.json({ message: 'Password reset successfully. Please log in.' });
};

module.exports = { register, login, refresh, logout, getMe, forgotPassword, resetPassword };
