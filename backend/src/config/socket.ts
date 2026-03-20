import { Server as SocketIOServer } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import jwt from 'jsonwebtoken';
import { env } from './env.js';
import { logger } from '../utils/logger.js';
import { setOnline, setOffline } from '../utils/presence.js';

let io: SocketIOServer | null = null;

export interface SocketUser {
  id: string;
  email: string;
  role: string;
}

/** Strip HTML tags from user-provided text to prevent XSS via WebSocket */
function sanitizeText(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim();
}

export function setupSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN.split(','),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 10000,
    transports: ['websocket', 'polling'],
  });

  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = jwt.verify(token, env.JWT_SECRET) as {
        id?: string;
        sub?: string;
        email: string;
        role: string;
      };

      const user: SocketUser = {
        id: payload.id || payload.sub || '',
        email: payload.email,
        role: payload.role,
      };

      if (!user.id) {
        return next(new Error('Invalid token payload'));
      }

      socket.data.user = user;
      next();
    } catch {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as SocketUser;
    logger.info(`[Socket.io] User connected: ${user.id}`);

    // Join user to their personal room
    socket.join(`user:${user.id}`);

    // Mark user as online in Redis
    setOnline(user.id);

    // Heartbeat: renew presence on each ping
    socket.on('heartbeat', () => {
      setOnline(user.id);
    });

    // Group chat rooms
    socket.on('join-group', (groupId: string) => {
      socket.join(`group:${groupId}`);
    });

    socket.on('leave-group', (groupId: string) => {
      socket.leave(`group:${groupId}`);
    });

    socket.on('group-message', (data: { groupId: string; id: string; text: string; timestamp: string }) => {
      const sanitized = sanitizeText(data.text);
      if (!sanitized) return;

      socket.to(`group:${data.groupId}`).emit('group-message', {
        id: data.id,
        userId: user.id,
        text: sanitized,
        timestamp: data.timestamp,
      });
    });

    socket.on('disconnect', (reason) => {
      logger.info(`[Socket.io] User disconnected: ${user.id} (${reason})`);
      setOffline(user.id);
    });
  });

  logger.info('[Socket.io] Server initialized');
  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('[Socket.io] Server not initialized. Call setupSocket() first.');
  }
  return io;
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  const server = getIO();
  server.to(`user:${userId}`).emit(event, data);
}
