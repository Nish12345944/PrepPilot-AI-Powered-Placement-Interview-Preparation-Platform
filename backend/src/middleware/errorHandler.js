const logger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const reqId = req.id || 'unknown';
  const userId = req.user?.id || 'anonymous';
  logger.error(`${err.message} [${reqId}]`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId,
  });

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message, requestId: reqId });
  }

  // PostgreSQL error codes
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Resource already exists', requestId: reqId });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced resource not found', requestId: reqId });
  }
  if (err.code === '23502') {
    return res.status(400).json({ error: 'Required field is missing', requestId: reqId });
  }
  if (err.code === '22P02') {
    return res.status(400).json({ error: 'Invalid value format', requestId: reqId });
  }

  // Multer file upload errors
  if (err.name === 'MulterError') {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? 'File too large'
      : err.code === 'LIMIT_UNEXPECTED_FILE'
        ? 'Unexpected file field'
        : err.message;
    return res.status(400).json({ error: msg, requestId: reqId });
  }

  // Rate limit
  if (err.name === 'RateLimitError') {
    return res.status(429).json({ error: 'Too many requests, please try again later', requestId: reqId });
  }

  // Fallback
  const status = err.status || 500;
  const isProd = process.env.NODE_ENV === 'production';
  res.status(status).json({
    error: isProd ? (status === 500 ? 'Internal server error' : err.message) : err.message,
    requestId: reqId,
  });
};

// 404 handler — registered after all routes, before errorHandler
const notFoundHandler = (req, res) => {
  logger.warn(`404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Endpoint not found' });
};

module.exports = errorHandler;
module.exports.notFoundHandler = notFoundHandler;

/**
 * Return a client-safe error message.
 * In production, generic "Internal server error" is returned for unexpected
 * 500-level failures so stack traces / SQL errors are never leaked to clients.
 * Client errors (4xx) keep their original message since those are controlled
 * by the application.
 */
const safeErrorMessage = (err, fallback = 'Internal server error') => {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) return err.message || fallback;
  // 4xx errors are application-level (validation, auth, etc.) — safe to show.
  if (err.status >= 400 && err.status < 500) return err.message || fallback;
  // Don't leak internal details for 5xx in production.
  return fallback;
};

module.exports.safeErrorMessage = safeErrorMessage;
