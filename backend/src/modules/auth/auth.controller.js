const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/db');
const redis = require('../../config/redis');
const { v4: uuidv4 } = require('uuid');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
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

module.exports = { register, login, refresh, logout, getMe };
