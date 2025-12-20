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
    // NOTE: Socket.IO is optional - AI chat uses HTTP requests and works without it
    if (user && user.id && socketUrl) {
      // Silently attempt connection for real-time features (notifications, messages)
      // If it fails, the app still works - only real-time updates are affected
      
      const newSocket = io(socketUrl, { 
        transports: ["polling"], // Use polling only
        upgrade: false,
        reconnection: true,
        reconnectionAttempts: 3, // Reduced attempts to fail faster
        reconnectionDelay: 2000,
        reconnectionDelayMax: 5000,
        timeout: 10000, // Shorter timeout
        forceNew: false,
        path: '/socket.io/',
        auth: {
          token: typeof window !== 'undefined' ? localStorage.getItem('token') : null
        }
      });
      
      setSocket(newSocket);

      newSocket.on('connect', () => {
        // Socket connected - real-time features now available
        setIsConnected(true);
        newSocket.emit("join", { user_id: user.id });
      });

      newSocket.on('connect_error', () => {
        // Connection failed - silently fall back to polling/HTTP
        // Real-time features won't work, but core functionality (AI chat, etc.) still works
        setIsConnected(false);
      });

      newSocket.on('disconnect', () => {
        setIsConnected(false);
      });

      newSocket.on('reconnect', () => {
        setIsConnected(true);
      });

      newSocket.on('reconnect_failed', () => {
        // Final connection failure - app will continue without real-time features
        setIsConnected(false);
      });

      // Listen for join confirmation
      newSocket.on('joined', () => {
        // Successfully joined room for real-time updates
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