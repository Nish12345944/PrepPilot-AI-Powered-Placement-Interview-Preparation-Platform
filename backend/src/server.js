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

// ============================================================
// CORS CONFIGURATION
// ============================================================

// Your deployed frontend
const frontendOrigin = 'https://preppilot-frontend-mk6y.onrender.com';

// Optional FRONTEND_URL from Render environment variables
const envOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Combine configured origins with the deployed frontend
const allowedOrigins = [
  frontendOrigin,
  ...envOrigins,
  'http://localhost:3000',
  'http://localhost:3001',
];

// Remove duplicates
const uniqueAllowedOrigins = [...new Set(allowedOrigins)];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no Origin header
    // (Postman, curl, server-to-server requests, etc.)
    if (!origin) {
      return callback(null, true);
    }

    if (uniqueAllowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    logger.warn(`CORS blocked origin: ${origin}`);
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },

  credentials: true,

  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
  ],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],

  exposedHeaders: [
    'X-Request-ID',
  ],

  optionsSuccessStatus: 204,
};

// Apply CORS BEFORE routes and rate limiting
app.use(cors(corsOptions));

// Explicitly handle browser preflight requests
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});

// ============================================================
// SOCKET.IO
// ============================================================

const io = new Server(server, {
  cors: {
    origin: uniqueAllowedOrigins,
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

setIO(io);

io.on('connection', (socket) => {
  const token =
    socket.handshake?.auth?.token ||
    socket.handshake?.query?.token;

  try {
    const decoded = jwt.verify(
      token || '',
      process.env.JWT_SECRET
    );

    socket.data.userId = decoded.userId;
    socket.join(`user:${decoded.userId}`);
  } catch (_) {
    // Unauthenticated sockets can connect,
    // but cannot join a user notification room.
    socket.data.userId = null;
  }
});

app.set('io', io);

// ============================================================
// EXPRESS / RENDER CONFIGURATION
// ============================================================

app.set('trust proxy', 1);

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },

    hsts:
      process.env.NODE_ENV === 'production'
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
  })
);

// ============================================================
// REQUEST MIDDLEWARE
// ============================================================

app.use(
  morgan('combined', {
    stream: {
      write: (msg) => logger.info(msg.trim()),
    },
  })
);

app.use(
  express.json({
    limit: '10mb',
  })
);

app.use(
  express.urlencoded({
    limit: '1mb',
    extended: false,
  })
);

// ============================================================
// REQUEST ID + RESPONSE TIME
// ============================================================

app.use((req, res, next) => {
  req.id = crypto.randomUUID();

  res.setHeader('X-Request-ID', req.id);

  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs =
      Number(process.hrtime.bigint() - start) / 1e6;

    logger.debug(
      `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(
        1
      )}ms [${req.id}]`
    );
  });

  next();
});

// ============================================================
// RATE LIMITING
// ============================================================

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,

  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,

  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    error:
      'Too many AI requests. Please slow down and try again shortly.',
  },
});

app.use('/api/', limiter);

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

[
  '/api/chat',
  '/api/coding/submit',
  '/api/coding/hint',
  '/api/resume/analyze',
  '/api/resume/upload',
  '/api/planner/generate',
  '/api/learning/path',
  '/api/learning/materials/generate',
  '/api/interview/sessions',
  '/api/interview/transcribe',
].forEach((path) => {
  app.use(path, aiLimiter);
});

// ============================================================
// API ROUTES
// ============================================================

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

// ============================================================
// PUBLIC ENDPOINTS
// ============================================================

const { query } = require('./config/db');

app.get('/api/public/companies', async (req, res) => {
  const { rows } = await query(`
    SELECT
      id,
      name,
      difficulty,
      focus_areas,
      (
        SELECT COUNT(*)
        FROM company_questions cq
        WHERE cq.company_id = c.id
      ) AS question_count
    FROM companies c
    ORDER BY
      CASE difficulty
        WHEN 'easy' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'hard' THEN 3
      END,
      name
  `);

  res.json(rows);
});

app.get('/api/public/questions', async (req, res) => {
  const {
    company,
    difficulty,
    type,
    limit = 10,
  } = req.query;

  let queryText = `
    SELECT
      q.id,
      q.title,
      q.description,
      q.type,
      q.difficulty,
      q.company_tags,
      q.options,
      q.time_limit_sec,
      q.xp_reward
    FROM questions q
    WHERE 1=1
  `;

  const params = [];

  if (company) {
    queryText += `
      AND $${params.length + 1} = ANY(q.company_tags)
    `;

    params.push(company);
  }

  if (difficulty) {
    queryText += `
      AND q.difficulty = $${params.length + 1}
    `;

    params.push(difficulty);
  }

  if (type) {
    queryText += `
      AND q.type = $${params.length + 1}
    `;

    params.push(type);
  }

  queryText += `
    ORDER BY q.created_at DESC
    LIMIT $${params.length + 1}
  `;

  params.push(parseInt(limit, 10));

  const { rows } = await query(queryText, params);

  res.json(rows);
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
  });
});

app.get('/health/ready', async (req, res) => {
  const checks = {
    postgres: false,
    redis: false,
  };

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

  const ready = checks.postgres;

  res
    .status(ready ? 200 : 503)
    .json({
      status: ready ? 'ready' : 'not_ready',
      checks,
    });
});

// ============================================================
// 404 HANDLER
// ============================================================

app.use(notFoundHandler);

// ============================================================
// ERROR HANDLER
// ============================================================

app.use(errorHandler);

// ============================================================
// TOKEN CLEANUP
// ============================================================

const cron = require('node-cron');

cron.schedule('0 * * * *', async () => {
  try {
    await query(`
      DELETE FROM refresh_tokens
      WHERE expires_at < NOW();

      DELETE FROM password_reset_tokens
      WHERE expires_at < NOW()
         OR used = TRUE;
    `);

    logger.info('Expired token cleanup complete');
  } catch (err) {
    logger.warn(
      'Token cleanup failed:',
      err.message
    );
  }
});

// ============================================================
// SERVER START
// ============================================================

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await redis.connect();
  } catch (err) {
    logger.warn(
      'Redis connection failed. Server will continue without Redis.'
    );
  }

  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(
      `Allowed CORS origins: ${uniqueAllowedOrigins.join(', ')}`
    );
  });
};

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

let shuttingDown = false;

const shutdown = async (signal) => {
  if (shuttingDown) return;

  shuttingDown = true;

  logger.info(
    `${signal} received — shutting down gracefully…`
  );

  server.close(async () => {
    try {
      if (io) {
        await io.close();
      }

      if (redis.client) {
        await redis.client.quit();
      }

      await db.pool.end();

      logger.info(
        'All connections closed. Exiting.'
      );

      process.exit(0);
    } catch (err) {
      logger.error(
        'Error during shutdown:',
        err.message
      );

      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.warn(
      'Forcing exit after shutdown timeout'
    );

    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ============================================================
// START ONLY WHEN RUN DIRECTLY
// ============================================================

if (require.main === module) {
  start().catch((err) => {
    logger.error(
      'Failed to start server',
      err
    );

    process.exit(1);
  });
}

module.exports = {
  app,
  server,
};