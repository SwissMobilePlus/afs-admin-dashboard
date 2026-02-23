import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://afs-api-production.up.railway.app';

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (typeof window === 'undefined') return null as any;
  if (socket?.connected) return socket;

  const token = localStorage.getItem('afs_admin_token');

  socket = io(`${API_URL}/support`, {
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('[Socket] Admin connected to support');
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
