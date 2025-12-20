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
      console.log(`[SocketContext] Socket.IO client version:`, io.version || 'unknown');
      
      const newSocket = io(socketUrl, { 
        transports: ["polling"], // Use polling only - more reliable on Render
        upgrade: false, // Don't try to upgrade to websocket
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: false,
        path: '/socket.io/',
        // Add auth if needed (JWT token)
        auth: {
          token: typeof window !== 'undefined' ? localStorage.getItem('token') : null
        }
      });
      
      console.log(`[SocketContext] Socket created, connecting...`);
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('[SocketContext] ✅ Socket connected successfully!');
        console.log('[SocketContext] Socket ID:', newSocket.id);
        console.log('[SocketContext] Transport:', newSocket.io.engine.transport.name);
        setIsConnected(true);
        // Join the user's room
        console.log(`[SocketContext] Joining room for user: ${user.id}`);
        newSocket.emit("join", { user_id: user.id });
      });

      newSocket.on('connect_error', (error: Error) => {
        console.error('[SocketContext] ❌ Socket connection error:', error);
        console.error('[SocketContext] Error details:', {
          message: error.message,
          // @ts-ignore - Socket.IO error may have additional properties
          description: error.description,
          // @ts-ignore
          context: error.context,
          // @ts-ignore
          type: error.type,
        });
        console.error('[SocketContext] Connection URL:', socketUrl);
        console.error('[SocketContext] User ID:', user.id);
        setIsConnected(false);
      });

      // Additional event listeners for debugging
      newSocket.on('disconnect', (reason: string) => {
        console.log('[SocketContext] Socket disconnected. Reason:', reason);
        setIsConnected(false);
      });

      newSocket.on('reconnect', (attemptNumber: number) => {
        console.log(`[SocketContext] Socket reconnected after ${attemptNumber} attempts`);
        setIsConnected(true);
      });

      newSocket.on('reconnect_attempt', (attemptNumber: number) => {
        console.log(`[SocketContext] Reconnection attempt ${attemptNumber}...`);
      });

      newSocket.on('reconnect_error', (error: Error) => {
        console.error('[SocketContext] Reconnection error:', error);
      });

      newSocket.on('reconnect_failed', () => {
        console.error('[SocketContext] ❌ Reconnection failed after all attempts');
      });

      // Listen for join confirmation
      newSocket.on('joined', (data: { user_id: string; status: string }) => {
        console.log('[SocketContext] ✅ Successfully joined room:', data);
      });

      // Log all events for debugging (can be disabled in production)
      if (process.env.NODE_ENV === 'development') {
        newSocket.onAny((event: string, ...args: any[]) => {
          console.log(`[SocketContext] Event: ${event}`, args);
        });
      }

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