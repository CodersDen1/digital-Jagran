const Redis = require('ioredis');

/**
 * Redis Service - L2 persistent cache layer
 * Connects to Redis at REDIS_URL or defaults to 104.156.249.42:6379
 * 
 * Provides get/set/del with automatic JSON serialization
 * and graceful fallback if Redis is unavailable.
 */

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let redis = null;
let isReady = false;

const connect = () => {
    try {
        redis = new Redis(REDIS_URL, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                if (times > 5) {
                    console.error('[Redis] Max retries reached, giving up reconnection.');
                    return null; // Stop retrying
                }
                const delay = Math.min(times * 500, 3000);
                console.log(`[Redis] Retrying connection in ${delay}ms (attempt ${times})`);
                return delay;
            },
            connectTimeout: 5000,
            commandTimeout: 3000,
            lazyConnect: false,
        });

        redis.on('connect', () => {
            console.log('[Redis] Connected to', REDIS_URL);
        });

        redis.on('ready', () => {
            isReady = true;
            console.log('[Redis] Ready to accept commands');
        });

        redis.on('error', (err) => {
            console.error('[Redis] Error:', err.message);
        });

        redis.on('close', () => {
            isReady = false;
            console.log('[Redis] Connection closed');
        });

    } catch (err) {
        console.error('[Redis] Failed to initialize:', err.message);
    }
};

/**
 * Get a cached value from Redis
 * @param {string} key
 * @returns {Promise<any|null>} Parsed value or null
 */
const get = async (key) => {
    if (!isReady || !redis) return null;
    try {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
    } catch (err) {
        console.error(`[Redis] GET ${key} error:`, err.message);
        return null;
    }
};

/**
 * Set a cached value in Redis with TTL
 * @param {string} key
 * @param {any} value - Will be JSON-stringified
 * @param {number} ttlSeconds - Time to live in seconds
 */
const set = async (key, value, ttlSeconds = 120) => {
    if (!isReady || !redis) return;
    try {
        await redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (err) {
        console.error(`[Redis] SET ${key} error:`, err.message);
    }
};

/**
 * Delete one or more keys from Redis
 * @param  {...string} keys
 */
const del = async (...keys) => {
    if (!isReady || !redis) return;
    try {
        await redis.del(...keys);
    } catch (err) {
        console.error(`[Redis] DEL error:`, err.message);
    }
};

/**
 * Delete all keys matching a pattern
 * @param {string} pattern - e.g. 'article_*'
 */
const delPattern = async (pattern) => {
    if (!isReady || !redis) return;
    try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    } catch (err) {
        console.error(`[Redis] DEL pattern ${pattern} error:`, err.message);
    }
};

/**
 * Check if Redis is connected and ready
 */
const isConnected = () => isReady;

// Connect on module load
connect();

module.exports = {
    get,
    set,
    del,
    delPattern,
    isConnected,
};
