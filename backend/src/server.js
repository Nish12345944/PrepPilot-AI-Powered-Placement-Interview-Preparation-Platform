require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const http = require('http');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const db = require('./config/db');
const redis = require('./config/redis');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { notFoundHandler } = require('./middleware/errorHandler');
const { setIO } = require('./utils/socket');

// Route imports
const authRoutes = require('./modules/auth/auth.routes');
const interviewRoutes = require('./modules/interview/interview.routes');
const codingRoutes = require('./modules/coding/coding.routes');
const learningRoutes = require('./modules/learning/learning.routes');
const resumeRoutes = require('./modules/resume/resume.routes');
const plannerRoutes = require('./modules/planner/planner.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const chatRoutes = require('./modules/chat/chat.routes');
const gamificationRoutes = require('./modules/gamification/gamification.routes');
const notificationRoutes = require('./modules/notifications/notifications.routes');
const profileRoutes = require('./modules/profile/profile.routes');

const app = express();
const server = http.createServer(app);

// CORS allowlist — FRONTEND_URL may be a comma-separated list. When unset we
// reflect the request origin so local/docker development keeps working, but in
// production FRONTEND_URL should always be an explicit allowlist.
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const corsOrigin = allowedOrigins.length ? allowedOrigins : true;

// Socket.IO for real-time notifications
const io = new Server(server, {
  cors: { origin: corsOrigin, credentials: true },
});

setIO(io);

io.on('connection', (socket) => {
  // Require a valid JWT so clients can only join their own notification room.
  // The two-arg form below is equivalent to socket.handshake.auth.token.
  const token = socket.handshake?.auth?.token || socket.handshake?.query?.token;
  try {
    const decoded = jwt.verify(token || '', process.env.JWT_SECRET);
    socket.data.userId = decoded.userId;
    socket.join(`user:${decoded.userId}`);
  } catch (_) {
    // Unauthenticated sockets may connect but cannot join any room.
    socket.data.userId = null;
  }
});

app.set('io', io);

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: corsOrigin, credentials: true }));
// Request logging with timing
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(express.json({ limit: '10mb' }));

// Request ID + response time for observability
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    logger.debug(`${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms [${req.id}]`);
  });
  next();
});

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/coding', codingRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/profile', profileRoutes);

// Public endpoints for testing
const { query } = require('./config/db');
app.get('/api/public/companies', async (req, res) => {
  const { rows } = await query(
    `SELECT id, name, difficulty, focus_areas, 
            (SELECT COUNT(*) FROM company_questions cq WHERE cq.company_id = c.id) as question_count
     FROM companies c ORDER BY 
       CASE difficulty 
         WHEN 'easy' THEN 1 
         WHEN 'medium' THEN 2 
         WHEN 'hard' THEN 3 
       END, name`
  );
  res.json(rows);
});

app.get('/api/public/questions', async (req, res) => {
  const { company, difficulty, type, limit = 10 } = req.query;
  
  let queryText = `
    SELECT q.id, q.title, q.description, q.type, q.difficulty, 
           q.company_tags, q.options, q.time_limit_sec, q.xp_reward
    FROM questions q
    WHERE 1=1
  `;
  const params = [];
  
  if (company) {
    queryText += ` AND $${params.length + 1} = ANY(q.company_tags)`;
    params.push(company);
  }
  
  if (difficulty) {
    queryText += ` AND q.difficulty = $${params.length + 1}`;
    params.push(difficulty);
  }
  
  if (type) {
    queryText += ` AND q.type = $${params.length + 1}`;
    params.push(type);
  }
  
  queryText += ` ORDER BY q.created_at DESC LIMIT $${params.length + 1}`;
  params.push(parseInt(limit));
  
  const { rows } = await query(queryText, params);
  res.json(rows);
});

// ── Health & Readiness ─────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.get('/health/ready', async (req, res) => {
  const checks = { postgres: false, redis: false };

  try {
    await db.query('SELECT 1');
    checks.postgres = true;
  } catch (_) {}

  try {
    if (!redis.client) {
      checks.redis = false;
    } else {
      await redis.client.ping();
      checks.redis = true;
    }
  } catch (_) {
    checks.redis = false;
  }

  const ready = checks.postgres; // DB is the critical dependency
  res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready', checks });
});

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await redis.connect();
  } catch (err) {
    logger.warn('Redis connection failed. Server will continue without Redis.');
  }

  server.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
};

// Only listen when run directly (not when required by tests/imports).
if (require.main === module) {
  start().catch((err) => {
    logger.error('Failed to start server', err);
    process.exit(1);
  });
}

module.exports = { app, server };
