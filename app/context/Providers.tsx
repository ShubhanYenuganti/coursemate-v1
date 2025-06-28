"use client";

import { AuthProvider } from "./AuthContext";
import { SocketProvider } from "./SocketContext";
import { CallProvider } from "./CallContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SocketProvider>
        <CallProvider>
          {children}
        </CallProvider>
      </SocketProvider>
    </AuthProvider>
  );
} 