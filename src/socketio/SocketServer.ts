// src/socketio/SocketServer.ts
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { redisClient } from '../config/redis';
import { createAdapter } from '@socket.io/redis-adapter';

export class SocketServer {
  private io: SocketIOServer;

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6 // 1 MB
    });

    // Setup Redis adapter for horizontal scaling
    const pubClient = redisClient.duplicate();
    const subClient = redisClient.duplicate();

    this.io.adapter(createAdapter(pubClient, subClient));

    // Setup event handlers
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Authenticate socket connection
      this.authenticateConnection(socket);

      socket.on('channel:broadcast_message', (message) => {
        // Just broadcast the message since it's already saved
        console.log('Broadcasting message:', message);
        socket.to(message.channelId).emit('channel:message', message);
      });

      // Handle workspace events
      socket.on('join:workspace', (workspaceId) => {
        socket.join(`workspace:${workspaceId}`);
      });

      // Handle channel events
      socket.on('join:channel', (channelId) => {
        socket.join(`channel:${channelId}`);
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  private authenticateConnection(socket: any): void {
    // Implement authentication logic here
    // Verify JWT token from handshake
    const token = socket.handshake.auth.token;
    // Verify token and attach user data to socket
  }

  // Methods to emit events
  public emitToWorkspace(workspaceId: string, event: string, data: any): void {
    this.io.to(`workspace:${workspaceId}`).emit(event, data);
  }

  public emitToChannel(channelId: string, event: string, data: any): void {
    this.io.to(`channel:${channelId}`).emit(event, data);
  }
}
