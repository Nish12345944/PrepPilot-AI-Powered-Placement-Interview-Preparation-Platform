const { createClient } = require('redis');
const logger = require('../utils/logger');

const redisUrl = process.env.REDIS_URL;
const client = redisUrl
  ? createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: false,
        connectTimeout: 5000,
      },
    })
  : null;
let redisAvailable = false;

if (client) {
  client.on('error', (err) => {
    redisAvailable = false;
    logger.error('Redis error', err);
  });
  client.on('connect', () => {
    redisAvailable = true;
    logger.info('Redis connected');
  });
}

const connect = async () => {
  if (!client) {
    logger.warn('Redis is not configured. Continuing without Redis.');
    return;
  }
  try {
    await client.connect();
    redisAvailable = true;
  } catch (err) {
    redisAvailable = false;
    logger.warn('Redis unavailable, continuing without Redis cache/token blacklist');
  }
};

const get = async (key) => {
  if (!redisAvailable || !client) return null;
  try {
    const val = await client.get(key);
    return val ? JSON.parse(val) : null;
  } catch (err) {
    logger.warn(`Redis get failed for ${key.split(':')[0]}:`, err.message);
    return null;
  }
};

const set = async (key, value, ttlSeconds = 3600) => {
  if (!redisAvailable || !client) return null;
  try {
    return client.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    logger.warn('Redis set failed:', err.message);
    return null;
  }
};

const del = async (key) => {
  if (!redisAvailable || !client) return null;
  try {
    return client.del(key);
  } catch (err) {
    logger.warn('Redis del failed:', err.message);
    return null;
  }
};

module.exports = { connect, get, set, del, client };
