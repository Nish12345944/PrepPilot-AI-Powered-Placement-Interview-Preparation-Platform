const { createClient } = require('redis');
const logger = require('../utils/logger');

const client = createClient({ url: process.env.REDIS_URL });

client.on('error', (err) => logger.error('Redis error', err));
client.on('connect', () => logger.info('Redis connected'));

const connect = async () => client.connect();

const get = async (key) => {
  const val = await client.get(key);
  return val ? JSON.parse(val) : null;
};

const set = async (key, value, ttlSeconds = 3600) => {
  await client.setEx(key, ttlSeconds, JSON.stringify(value));
};

const del = async (key) => client.del(key);

module.exports = { connect, get, set, del, client };
