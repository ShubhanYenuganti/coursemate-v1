"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
// @ts-ignore
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext'; // Import the useAuth hook

// Use environment variable for backend URL, with fallback
const socketUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL;

interface ISocketContext {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<ISocketContext | null>(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth(); // Get the current user from AuthContext

  useEffect(() => {
    // Only try to connect if the user is logged in and socketUrl is available
    if (user && user.id && socketUrl) {
      console.log(`[SocketContext] User is authenticated (${user.id}), creating socket to ${socketUrl}...`);
      // TEMPORARY: Force polling only to test if WebSocket is the issue
      // Render free tier may not support WebSockets properly
      const newSocket = io(socketUrl, { 
        transports: ["polling"], // Use polling only - more reliable on Render
        upgrade: false, // Don't try to upgrade to websocket
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: false,
        // Add path if Socket.IO is mounted at a different path
        path: '/socket.io/',
      });
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('[SocketContext] Socket connected:', newSocket.id);
        setIsConnected(true);
        // Join the user's room
        newSocket.emit("join", { user_id: user.id });
      });

      newSocket.on('disconnect', () => {
        console.log('[SocketContext] Socket disconnected');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error: Error) => {
        console.error('[SocketContext] Socket connection error:', error);
        console.error('[SocketContext] Error details:', {
          message: error.message,
          // @ts-ignore - Socket.IO error may have additional properties
          description: error.description,
          // @ts-ignore
          context: error.context,
          // @ts-ignore
          type: error.type,
        });
        setIsConnected(false);
      });

      // Log all events for debugging
      newSocket.onAny((event: string, ...args: any[]) => {
        console.log(`[SocketContext] Event: ${event}`, args);
      });

      // Cleanup on unmount or when user changes
      return () => {
        console.log('[SocketContext] Disconnecting socket.');
        newSocket.disconnect();
      };
    } else {
        // If there is no user, ensure any existing socket is disconnected and state is cleared.
        if(socket) {
            socket.disconnect();
            setSocket(null);
            setIsConnected(false);
        }
    }
  }, [user]); // Re-run the effect whenever the user object changes

  const value = {
    socket,
    isConnected,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}; 