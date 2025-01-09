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
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5 // limit each IP to 5 requests per windowMs
  });
// Apply middleware
router.use(debugAuth); // Optional: for debugging
router.use(checkJwt);  // Auth0 JWT verification

router.post('/', UserController.createUser);
router.get('/me', UserController.getUser);
router.put('/me', UserController.updateUser);
router.post('/register', async (req, res) => {
    try {
        const validationResult = ValidationUtils.validateRegistration({
            email: req.body.email,
            password: req.body.password,
            username: req.body.username,
            auth0Id: req.body.auth0Id
            });
        
            if (!validationResult.isValid) {
            return res.status(400).json({ errors: validationResult.errors });
            }
  
      const { email, password } = req.body;
  
      // Check if user already exists
      let user = await User.findOne({ email });
      if (user) return res.status(400).json({ error: 'User already exists' });
  
      // Create new user
      user = new User({
        email,
        password,
        verificationToken: crypto.randomBytes(32).toString('hex')
      });
  
      await user.save();
  
      // Send verification email (implement email service)
      // await sendVerificationEmail(user.email, user.verificationToken);
  
      res.status(201).json({ message: 'Registration successful. Please check your email for verification.' });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });
  router.post('/login', loginLimiter, async (req, res) => {
    
    try {
        const validationResult = ValidationUtils.validateLogin({
            email: req.body.email,
            password: req.body.password
            });
        
            if (!validationResult.isValid) {
            return res.status(400).json({ errors: validationResult.errors });
            }
      const { email, password } = req.body;
      
      // Find user
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ error: 'Invalid credentials' });
  
      // Check if account is locked
      if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
        return res.status(403).json({ 
          error: 'Account is temporarily locked. Please try again later.' 
        });
      }
  
      // Verify password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        user.failedLoginAttempts += 1;
        
        // Lock account after 5 failed attempts
        if (user.failedLoginAttempts >= 5) {
          user.lockUntil = new Date(Date.now() + (30 * 60 * 1000)); // Lock for 30 minutes
        }
        
        await user.save();
        return res.status(400).json({ error: 'Invalid credentials' });
      }
  
      // Reset failed attempts on successful login
      user.failedLoginAttempts = 0;
      await user.save();
  
      // Generate JWT token
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET as string,
        { expiresIn: '1h' }
      );
  
      res.json({ token });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });
  
export default router;