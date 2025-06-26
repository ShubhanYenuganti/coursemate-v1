"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
// @ts-ignore
import Peer from 'peerjs';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

interface CallerData {
    caller_id: string;
    caller_peer_id: string;
    caller_name: string;
}

interface ICallContext {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isCallActive: boolean;
  incomingCall: CallerData | null;
  startCall: (receiverId: string) => void;
  endCall: () => void;
  acceptCall: () => void;
  declineCall: () => void;
}

const CallContext = createContext<ICallContext | null>(null);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const peerRef = useRef<Peer | null>(null);
  const [peerId, setPeerId] = useState<string>('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [incomingCall, setIncomingCall] = useState<CallerData | null>(null);
  const [activeCall, setActiveCall] = useState<any>(null); // PeerJS call object

  const { socket } = useSocket();
  const { user } = useAuth(); // Get current user info

  useEffect(() => {
    if (!socket || !user?.id) return;

    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', (id) => {
      setPeerId(id);
    });

    peer.on('call', (call) => {
        // This is an incoming call, but it's initiated by the other user's `peer.call`.
        // We will handle this via signaling instead to show a UI first.
    });
    
    // Listen for signaling events from the server
    socket.on('incoming-call', (data: CallerData) => {
        console.log('[CallContext] Received "incoming-call" with data:', data);
        setIncomingCall(data);
    });

    socket.on('call-accepted', (data: { receiver_peer_id: string }) => {
        // This user started the call, and the other user accepted.
        // Now, call the receiver using their peer id.
        if (localStream) {
            const call = peer.call(data.receiver_peer_id, localStream);
            setActiveCall(call);
            call.on('stream', (remoteUserStream) => {
                setRemoteStream(remoteUserStream);
                setIsCallActive(true);
            });
        }
    });

    socket.on('call-ended', () => {
        endCall();
    });

    return () => {
      peer.destroy();
      socket.off('incoming-call');
      socket.off('call-accepted');
      socket.off('call-ended');
    };
  }, [socket, user]);
  
  const startCall = (receiverId: string) => {
    console.log(`[CallContext] Attempting to start call to receiverId: ${receiverId}`);
    if (!peerRef.current || !socket || !peerId || !user) {
        console.error('[CallContext] startCall failed: Missing peer, socket, peerId, or user.', {
            hasPeer: !!peerRef.current,
            hasSocket: !!socket,
            hasPeerId: !!peerId,
            hasUser: !!user
        });
        return;
    }

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        console.log('[CallContext] Got local media stream.');
        setLocalStream(stream);
        
        const payload = {
            receiver_id: receiverId,
            caller_data: {
                caller_id: user.id,
                caller_peer_id: peerId,
                caller_name: user.name || 'Anonymous'
            }
        };

        console.log('[CallContext] Emitting "start-call" with payload:', payload);
        socket.emit('start-call', payload);
      });
  };

  const acceptCall = () => {
    if (!peerRef.current || !socket || !incomingCall || !user) return;
    
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            setLocalStream(stream);

            const call = peerRef.current!.call(incomingCall.caller_peer_id, stream);
            setActiveCall(call);
            
            call.on('stream', (remoteStream) => {
                setRemoteStream(remoteStream);
                setIsCallActive(true);
            });

            // Let the caller know you accepted
            // Note: In a simpler model, you could just have the acceptor call the initiator.
            // But this double-confirmation is more robust for UI state.
            // This example simplifies by just having the acceptor initiate the `peer.call`.
            // The `call-accepted` signal might be redundant in this simplified flow,
            // but is kept for consistency with the backend.
            setIncomingCall(null);
        });
  };
  
  const declineCall = () => {
      // In a real app, you might want to send a 'call-declined' signal
      setIncomingCall(null);
  }
  
  const endCall = () => {
      if (activeCall) {
        activeCall.close();
      }
      setIsCallActive(false);
      localStream?.getTracks().forEach(track => track.stop());
      setLocalStream(null);
      setRemoteStream(null);
      setActiveCall(null);
      setIncomingCall(null);
      // Optional: send a hang-up signal
  };

  const value = {
    localStream,
    remoteStream,
    isCallActive,
    incomingCall,
    startCall,
    endCall,
    acceptCall,
    declineCall,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}; 