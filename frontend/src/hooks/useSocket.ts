import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  namespace: string;
  auth?: Record<string, unknown>;
  onConnect?(socket: Socket): void;
  onDisconnect?(socket: Socket): void;
}

export const useSocket = ({ namespace, auth, onConnect, onDisconnect }: UseSocketOptions): Socket | null => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
    const socket = io(`${baseUrl}${namespace}`, {
      autoConnect: true,
      transports: ['websocket'],
      auth,
    });
    socketRef.current = socket;

    if (onConnect) {
      socket.on('connect', () => onConnect(socket));
    }
    if (onDisconnect) {
      socket.on('disconnect', () => onDisconnect(socket));
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [namespace, JSON.stringify(auth)]);

  return socketRef.current;
};
