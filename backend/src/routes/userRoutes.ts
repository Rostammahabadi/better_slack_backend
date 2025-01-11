// src/routes/userRoutes.ts
import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { checkJwt, debugAuth } from '../middleware/auth';
import User from '../models/User';
import crypto from 'crypto';
import { ValidationUtils } from '../utils/validation';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
// Apply middleware
router.use(debugAuth); // Optional: for debugging
router.use(checkJwt);  // Auth0 JWT verification

router.get('/me', UserController.getUser);
router.put('/me', UserController.updateUser);
  
export default router;