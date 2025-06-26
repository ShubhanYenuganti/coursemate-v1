"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
// @ts-ignore
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext'; // Import the useAuth hook

const socketUrl = "http://localhost:5173";

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
    // Only try to connect if the user is logged in
    if (user && user.id) {
      console.log(`[SocketContext] User is authenticated (${user.id}), creating socket...`);
      const newSocket = io(socketUrl, { transports: ["websocket"] });
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