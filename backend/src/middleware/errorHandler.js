const logger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const reqId = req.id || 'unknown';
  logger.error(`${err.message} [${reqId}]`, { stack: err.stack, path: req.path, method: req.method });

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
