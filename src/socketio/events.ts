// src/socketio/events.ts
export const SOCKET_EVENTS = {
    MESSAGE: {
      NEW: 'message:new',
      UPDATE: 'message:update',
      DELETE: 'message:delete',
      REACTION: 'message:reaction'
    },
    CHANNEL: {
      JOIN: 'channel:join',
      LEAVE: 'channel:leave',
      UPDATE: 'channel:update'
    },
    WORKSPACE: {
      JOIN: 'workspace:join',
      LEAVE: 'workspace:leave',
      UPDATE: 'workspace:update'
    },
    USER: {
      PRESENCE: 'user:presence',
      TYPING: 'user:typing'
    }
  };
  