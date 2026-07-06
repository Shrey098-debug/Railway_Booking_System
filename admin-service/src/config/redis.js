const Redis = require('ioredis');
const { config } = require('.');
const logger = require('./logger');

/**
 * Shared ioredis connection. Used by the stream producer/consumer (Redis Streams
 * replaced Kafka as the event bus).
 *
 * NOTE: blocking stream reads (XREADGROUP BLOCK) must use a DEDICATED connection,
 * created via redis.duplicate({ maxRetriesPerRequest: null }) in the consumer.
 */
class RedisClient {
     static instance;
     static isConnected = false;

     static getInstance() {
          if (!RedisClient.instance) {
               RedisClient.instance = new Redis(config.REDIS_URL, {
                    retryStrategy: (times) => Math.min(times * 50, 2000),
                    maxRetriesPerRequest: 3,
               });
               RedisClient.setupEventListeners();
          }
          return RedisClient.instance;
     }

     static setupEventListeners() {
          RedisClient.instance.on('connect', () => {
               RedisClient.isConnected = true;
               logger.info('Connected to Redis');
          });
          RedisClient.instance.on('error', (error) => {
               RedisClient.isConnected = false;
               logger.error('Redis connection error', error);
          });
          RedisClient.instance.on('close', () => {
               RedisClient.isConnected = false;
               logger.warn('Redis connection closed');
          });
          RedisClient.instance.on('reconnecting', () => logger.warn('Reconnecting to Redis...'));
          RedisClient.instance.on('ready', () => logger.info('Redis client is ready'));
     }

     static async closeConnection() {
          if (RedisClient.instance) {
               try {
                    await RedisClient.instance.quit();
                    logger.info('Redis connection closed');
               } catch (error) {
                    logger.error('Error closing Redis connection: ', error);
               }
          }
     }

     static isReady() {
          return RedisClient.isConnected;
     }
}

module.exports = { redis: RedisClient.getInstance(), RedisClient };
