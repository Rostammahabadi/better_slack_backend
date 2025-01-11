// backend/src/server.ts
import express, { Application } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { errorHandler } from './middleware/errorHandler';
import { messageRateLimiter } from './middleware/rateLimiter';
import { authenticate } from './middleware/auth';
import userRoutes from './routes/userRoutes';
import { rateLimiter } from './middleware/rateLimiter';
import messageRoutes from './routes/messageRoutes';
import channelRoutes from './routes/channelRoutes';
import reactionRoutes from './routes/reactionRoutes';
import workspaceRoutes from './routes/workspaceRoutes';
import inviteRoutes from './routes/inviteRoutes';

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

class APIServer {
  private app: Application;

  constructor() {
    this.app = express();
    this.configureMiddleware();
    this.configureRoutes();
    this.initializeServices();
  }

  private configureMiddleware(): void {
    this.app.use(cors({
      origin: process.env.FRONTEND_URL,
      credentials: true
    }));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(errorHandler);
  }

  private configureRoutes(): void {
    this.app.use('/api/users',rateLimiter, authenticate, userRoutes);
    this.app.use('/register', userRoutes);
    this.app.use('/api/messages',messageRateLimiter, authenticate, messageRoutes);
    this.app.use('/api/channels', authenticate, channelRoutes);
    this.app.use('/api/workspaces', rateLimiter, authenticate, workspaceRoutes);
    this.app.use('/api', rateLimiter, authenticate, reactionRoutes);
    this.app.use('/api/invites', rateLimiter, inviteRoutes);
    
    this.app.get('/health', (req, res) => {
      res.status(200).json({ status: 'healthy' });
    });
  }

  private async initializeServices(): Promise<void> {
    try {

      await mongoose.connect(process.env.MONGODB_URI as string);
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('Failed to initialize services:', error);
      process.exit(1);
    }
  }

  public async start(): Promise<void> {
    const port = process.env.PORT || 3000;
    this.app.listen(port, () => {
      console.log(`API Server running on port ${port}`);
    });
  }
}
const server = new APIServer();
server.start().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
