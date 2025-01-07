// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { auth } from 'express-oauth2-jwt-bearer';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.AUTH0_AUDIENCE || !process.env.AUTH0_DOMAIN) {
  throw new Error('Missing required AUTH0 environment variables');
}

export const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
  tokenSigningAlg: 'RS256',
  authRequired: true,
});

// Debug middleware to log token information
export const debugAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  console.log('\n=== Auth Debug ===');
  console.log('Auth Header:', authHeader);
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    console.log('Token:', token);
    console.log('Token length:', token?.length);
  }
  console.log('Auth0 Audience:', process.env.AUTH0_AUDIENCE);
  console.log('Auth0 Domain:', process.env.AUTH0_DOMAIN);
  console.log('=================\n');
  next();
};

// You can keep the authenticate middleware for additional custom auth logic
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Add any additional authentication logic here
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};
