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

// Optional: Add user info validation
export const validateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth0Id = req.auth?.payload.sub;
    if (!auth0Id) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// Debug middleware to log token information
export const debugAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
  }
  next();
};

// You can keep the authenticate middleware for additional custom auth logic
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    checkJwt(req, res, next);
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};
