// src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
export const messageRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 300, // 300 messages per minute (5 messages per second)
  message: 'Too many messages sent. Please slow down.'
});
export const inviteRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 invite-related requests per windowMs
  message: 'Too many invite requests from this IP, please try again after 15 minutes'
});