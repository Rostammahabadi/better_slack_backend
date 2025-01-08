// src/tests/socket.test.ts
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as ioc } from 'socket.io-client';
import { expect } from 'chai';
import { SOCKET_EVENTS } from '../socketio/events';

describe('Socket.IO Server', () => {
  let io: Server;
  let serverSocket: any;
  let clientSocket: any;
  const PORT = 3001;

  before(function(done) {
    this.timeout(10000);
    const httpServer = createServer();
    
    io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    httpServer.listen(PORT, () => {
      clientSocket = ioc(`http://localhost:${PORT}`, {
        transports: ['websocket'],
        forceNew: true,
        timeout: 60000
      });

      io.on('connection', (socket) => {
        console.log('Server connected');
        serverSocket = socket;
        done();
      });
    });
  });

  after(() => {
    if (clientSocket) clientSocket.disconnect();
    if (io) io.close();
  });

  // Connection Tests
  it('should establish connection', (done) => {
    expect(clientSocket.connected).to.be.true;
    done();
  });

  // Workspace Tests
  it('should join workspace room', (done) => {
    const workspaceId = 'test-workspace-123';
    clientSocket.emit('join:workspace', workspaceId);
    
    serverSocket.on('join:workspace', (id) => {
      serverSocket.join(`workspace:${id}`);
    });

    setTimeout(() => {
      const rooms = serverSocket.rooms;
      expect(rooms.has(`workspace:${workspaceId}`)).to.be.true;
      done();
    }, 100);
  });

  // Channel Tests
  it('should join and leave channel room', (done) => {
    const channelId = 'test-channel-123';
    
    clientSocket.emit('join:channel', channelId);
    serverSocket.on('join:channel', (id) => {
      serverSocket.join(`channel:${id}`);
    });

    setTimeout(() => {
      expect(serverSocket.rooms.has(`channel:${channelId}`)).to.be.true;
      
      clientSocket.emit('leave:channel', channelId);
      serverSocket.on('leave:channel', (id) => {
        serverSocket.leave(`channel:${id}`);
      });

      setTimeout(() => {
        expect(serverSocket.rooms.has(`channel:${channelId}`)).to.be.false;
        done();
      }, 100);
    }, 100);
  });

  it('should broadcast message to channel', (done) => {
    const channelId = 'test-channel-123';
    const testMessage = { content: 'Hello Channel', channelId };

    clientSocket.emit(SOCKET_EVENTS.CHANNEL.JOIN, channelId);
    
    clientSocket.on(SOCKET_EVENTS.MESSAGE.NEW, (data) => {
      expect(data.content).to.equal(testMessage.content);
      expect(data.channelId).to.equal(channelId);
      done();
    });

    setTimeout(() => {
      io.to(`channel:${channelId}`).emit(SOCKET_EVENTS.MESSAGE.NEW, testMessage);
    }, 100);
  });

  it('should handle unauthenticated connections', (done) => {
    const unauthSocket = ioc(`http://localhost:${PORT}`, {
      transports: ['websocket'],
      forceNew: true
    });

    unauthSocket.on('connect_error', () => {
      unauthSocket.disconnect();
      done();
    });
  });

  it('should handle invalid channel joins', (done) => {
    clientSocket.emit(SOCKET_EVENTS.CHANNEL.JOIN, null);
    
    clientSocket.on('error', (error) => {
      expect(error).to.exist;
      done();
    });
  });
});
