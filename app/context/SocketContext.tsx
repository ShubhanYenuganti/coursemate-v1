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
      const newSocket = io(socketUrl, { 
        transports: ["polling", "websocket"], // Try polling first, then upgrade to websocket
        upgrade: true, // Allow upgrade from polling to websocket
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: false,
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

      newSocket.on('connect_error', (error) => {
        console.error('[SocketContext] Socket connection error:', error);
        console.error('[SocketContext] Error details:', {
          message: error.message,
          description: error.description,
          context: error.context,
          type: error.type,
        });
        setIsConnected(false);
      });

      // Log all events for debugging
      newSocket.onAny((event, ...args) => {
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