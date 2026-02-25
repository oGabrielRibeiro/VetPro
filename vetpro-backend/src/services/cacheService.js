/**
 * Cache Service - VetPro
 * Implementa caching com Redis para melhorar performance
 */

const Redis = require('ioredis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.redis = null;
    this.enabled = false;
    this.defaultTTL = 3600;

    this.initialize();
  }

  initialize() {
    const redisUrl = process.env.REDIS_URL;

    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          retryDelayOnFailover: 100,
          lazyConnect: true,
          enableOfflineQueue: true,
        });

        this.redis.on('connect', () => {
          logger.info('Redis conectado');
          this.enabled = true;
        });

        this.redis.on('error', (err) => {
          logger.warn('Erro no Redis', { error: err.message });
          this.enabled = false;
        });

        this.redis.connect().catch(() => {
          logger.warn('Redis nao disponivel, usando fallback memoria');
        });
      } catch (error) {
        logger.warn('Redis nao configurado', { error: error.message });
      }
    } else {
      logger.info('REDIS_URL nao definido, cache desabilitado');
    }
  }

  generateKey(prefix, ...args) {
    return `vetpro:${prefix}:${args.join(':')}`;
  }

  async get(key) {
    if (!this.enabled || !this.redis) {
      return null;
    }

    try {
      const value = await this.redis.get(key);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      logger.warn('Cache get error', { key, error: error.message });
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    if (!this.enabled || !this.redis) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(key, ttl, serialized);
      return true;
    } catch (error) {
      logger.warn('Cache set error', { key, error: error.message });
      return false;
    }
  }

  async del(key) {
    if (!this.enabled || !this.redis) {
      return false;
    }

    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      logger.warn('Cache del error', { key, error: error.message });
      return false;
    }
  }

  async delByPattern(pattern) {
    if (!this.enabled || !this.redis) {
      return false;
    }

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      return true;
    } catch (error) {
      logger.warn('Cache delByPattern error', {
        pattern,
        error: error.message,
      });
      return false;
    }
  }

  async incr(key) {
    if (!this.enabled || !this.redis) {
      return null;
    }

    try {
      return await this.redis.incr(key);
    } catch (error) {
      logger.warn('Cache incr error', { key, error: error.message });
      return null;
    }
  }

  async expire(key, ttl) {
    if (!this.enabled || !this.redis) {
      return false;
    }

    try {
      await this.redis.expire(key, ttl);
      return true;
    } catch (error) {
      logger.warn('Cache expire error', { key, ttl, error: error.message });
      return false;
    }
  }

  async ttl(key) {
    if (!this.enabled || !this.redis) {
      return -1;
    }

    try {
      return await this.redis.ttl(key);
    } catch (error) {
      logger.warn('Cache ttl error', { key, error: error.message });
      return -1;
    }
  }

  async cached(key, fn, ttl = this.defaultTTL) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    const result = await fn();
    if (result !== null && result !== undefined) {
      await this.set(key, result, ttl);
    }

    return result;
  }

  async warmup(functions = []) {
    logger.info('Executando warmup de cache...');
    const promises = functions.map((fn) => fn());
    await Promise.allSettled(promises);
    logger.info('Warmup de cache concluido');
  }

  async flush() {
    if (!this.enabled || !this.redis) {
      return false;
    }

    try {
      await this.redis.flushdb();
      return true;
    } catch (error) {
      logger.warn('Cache flush error', { error: error.message });
      return false;
    }
  }

  async stats() {
    if (!this.enabled || !this.redis) {
      return { enabled: false };
    }

    try {
      return {
        enabled: true,
        connected: this.redis.status === 'ready',
      };
    } catch (error) {
      return { enabled: false, error: error.message };
    }
  }
}

module.exports = new CacheService();
