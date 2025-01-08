// src/config/redis.ts
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create Redis client with configuration
export const redisClient = new Redis(REDIS_URL, {
  retryStrategy: (times: number) => {
    // Maximum retry delay is 3000ms
    const delay = Math.min(times * 50, 3000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  }
});

// Error handling
redisClient.on('error', (error) => {
  console.error('Redis connection error:', error);
});

redisClient.on('connect', () => {
  console.log('Redis client connected');
});

// Cache keys
export const CACHE_KEYS = {
  USER_PRESENCE: (userId: string) => `user:presence:${userId}`,
  CHANNEL_MESSAGES: (channelId: string) => `channel:messages:${channelId}`,
  USER_SESSION: (userId: string) => `user:session:${userId}`,
  TYPING_INDICATOR: (channelId: string) => `typing:channel:${channelId}`,
  WORKSPACE_CHANNELS: (workspaceId: string) => `workspace:channels:${workspaceId}`
};

// Cache TTLs (in seconds)
export const CACHE_TTL = {
  USER_PRESENCE: 300, // 5 minutes
  CHANNEL_MESSAGES: 3600, // 1 hour
  USER_SESSION: 86400, // 24 hours
  TYPING_INDICATOR: 10 // 10 seconds
};

export default redisClient;
