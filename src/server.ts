import express, { Application } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { Socket } from 'socket.io';
import mongoose from 'mongoose';
import { Redis } from 'ioredis';
import { KubeMQClient } from 'kubemq-js';
import dotenv from 'dotenv';
dotenv.config();
// Route Imports
import userRoutes from './routes/userRoutes';
import messageRoutes from './routes/messageRoutes';
import channelRoutes from './routes/channelRoutes';
import workspaceRoutes from './routes/workspaceRoutes';
// Middleware Imports
import { errorHandler } from './middleware/errorHandler';
import { authenticate } from './middleware/auth';
import { rateLimiter } from './middleware/rateLimiter';

class Server {
  private app: Application;
  private httpServer: any;
  private io: SocketServer;
  private redis: Redis;
  private kubemq: KubeMQClient;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = new SocketServer(this.httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL,
        methods: ['GET', 'POST']
      }
    });

    // Initialize these properties
    this.redis = new Redis();
    this.kubemq = new KubeMQClient({
      address: process.env.KUBEMQ_ADDRESS || '',
      clientId: `server-${process.env.POD_NAME || 'main'}`
    });
    
    
    this.configureMiddleware();
    this.configureRoutes();
    this.configureSockets();
    this.initializeServices();
  }

  private configureMiddleware(): void {

    // Express middleware
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(rateLimiter);
    
    // Global error handler
    this.app.use(errorHandler);
  }

  private configureRoutes(): void {
    // API routes
    this.app.use('/api/users', authenticate, userRoutes);
    this.app.use('/api/messages', authenticate, messageRoutes);
    this.app.use('/api/channels', authenticate, channelRoutes);
    this.app.use('/api/workspaces', authenticate, workspaceRoutes);
    console.log("setpu the app")

    // Health check route
    this.app.get('/health', (req, res) => {
      res.status(200).json({ status: 'healthy' });
    });
  }

  private configureSockets(): void {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('join_channel', (channelId: string) => {
        socket.join(channelId);
        console.log(`Socket ${socket.id} joined channel ${channelId}`);
      });

      socket.on('leave_channel', (channelId: string) => {
        socket.leave(channelId);
        console.log(`Socket ${socket.id} left channel ${channelId}`);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  private async initializeServices(): Promise<void> {
    try {
      // Initialize Redis
      this.redis = new Redis({
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD
      });

      // Initialize KubeMQ
      this.kubemq = new KubeMQClient({
        address: process.env.KUBEMQ_ADDRESS,
        clientId: `server-${process.env.POD_NAME || 'main'}`
      });

      // Initialize MongoDB
      await mongoose.connect(process.env.MONGODB_URI as string);
      console.log('Connected to MongoDB');

    } catch (error) {
      console.error('Failed to initialize services:', error);
      process.exit(1);
    }
  }

  public async start(): Promise<void> {
    try {
      const port = process.env.PORT || 3000;
      
      this.httpServer.listen(port, () => {
        console.log(`Server running on port ${port}`);
      });

    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  public async shutdown(): Promise<void> {
    try {
      // Close database connections
      await mongoose.connection.close();
      await this.redis.quit();
      await this.kubemq.close();

      // Close server
      this.httpServer.close();

      console.log('Server shut down successfully');
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Create and start server instance
const server = new Server();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Starting graceful shutdown...');
  await server.shutdown();
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Starting graceful shutdown...');
  await server.shutdown();
});

// Start the server
server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default server;
