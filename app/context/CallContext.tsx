"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
// @ts-ignore
import Peer from 'peerjs';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { useRouter } from 'next/navigation';

interface CallerData {
    caller_id: string;
    caller_peer_id: string;
    caller_name: string;
}

interface ICallContext {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isCallActive: boolean;
  isCallInitiating: boolean;
  incomingCall: CallerData | null;
  startCall: (receiverId: string) => void;
  endCall: () => void;
  acceptCall: () => void;
  declineCall: () => void;
  isPeerReady: boolean;
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
  const localStreamRef = useRef<MediaStream | null>(null); // Ref to track local stream immediately
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isCallInitiating, setIsCallInitiating] = useState(false);
  const [incomingCall, setIncomingCall] = useState<CallerData | null>(null);
  const [activeCall, setActiveCall] = useState<any>(null); // PeerJS call object
  const [isPeerReady, setIsPeerReady] = useState(false);

  const { socket } = useSocket();
  const { user } = useAuth(); // Get current user info
  const router = useRouter();

  // Persist call state across Fast Refresh
  useEffect(() => {
    const savedCallState = sessionStorage.getItem('callState');
    if (savedCallState) {
      const { isCallActive: savedIsCallActive, isCallInitiating: savedIsCallInitiating } = JSON.parse(savedCallState);
      setIsCallActive(savedIsCallActive);
      setIsCallInitiating(savedIsCallInitiating);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem('callState', JSON.stringify({ isCallActive, isCallInitiating }));
  }, [isCallActive, isCallInitiating]);

  useEffect(() => {
    if (!socket || !user?.id) return;

    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', (id) => {
      setPeerId(id);
      // Register the peer ID with the backend for call signaling
      if (socket && user?.id) {
        console.log('[CallContext] Registering peer ID with backend:', id);
        socket.emit('register-peer', { user_id: user.id, peer_id: id });
      }
    });

    peer.on('call', (call) => {
        // This is an incoming call from the other user
        console.log('[CallContext] Received incoming PeerJS call');
        setActiveCall(call);
        
        // Wait for local stream to be available before answering
        let retryCount = 0;
        const maxRetries = 50; // 5 seconds max
        const answerCall = () => {
            if (localStreamRef.current) {
                console.log('[CallContext] Answering call with local stream');
                call.answer(localStreamRef.current);
            } else if (retryCount < maxRetries) {
                retryCount++;
                console.log('[CallContext] Local stream not ready yet, retrying...', retryCount);
                setTimeout(answerCall, 100);
            } else {
                console.error('[CallContext] Failed to get local stream after timeout');
            }
        };
        answerCall();
        
        call.on('stream', (remoteUserStream) => {
            console.log('[CallContext] Received remote stream from incoming call');
            setRemoteStream(remoteUserStream);
            setIsCallActive(true);
            setIsCallInitiating(false);
        });

        call.on('close', () => {
            console.log('[CallContext] Incoming call closed');
        });

        call.on('error', (err) => {
            console.error('[CallContext] Incoming call error:', err);
        });
    });
    
    // Listen for signaling events from the server
    socket.on('incoming-call', (data: CallerData) => {
        console.log('[CallContext] Received "incoming-call" with data:', data);
        setIncomingCall(data);
    });

    socket.on('call-accepted', (data: { receiver_peer_id: string }) => {
        console.log('[CallContext] Received "call-accepted" with data:', data);
        // This user started the call, and the other user accepted.
        // Now, call the receiver using their peer id.
        if (data.receiver_peer_id) {
            console.log('[CallContext] Call accepted, checking for local stream...');
            // Use ref to check for local stream immediately
            if (localStreamRef.current) {
                console.log('[CallContext] Local stream available, calling peer with ID:', data.receiver_peer_id);
                const call = peer.call(data.receiver_peer_id, localStreamRef.current);
                setActiveCall(call);
                call.on('stream', (remoteUserStream) => {
                    console.log('[CallContext] Received remote stream from outgoing call');
                    setRemoteStream(remoteUserStream);
                    setIsCallActive(true);
                    setIsCallInitiating(false);
                });
                
                call.on('close', () => {
                    console.log('[CallContext] Outgoing call closed');
                });

                call.on('error', (err) => {
                    console.error('[CallContext] Outgoing call error:', err);
                });
            } else {
                console.error('[CallContext] Local stream not available in ref');
            }
        } else {
            console.error('[CallContext] Cannot make call: missing receiver_peer_id');
        }
    });

    socket.on('call-ended', () => {
        endCall();
    });

    socket.on('hang-up', (data: any) => {
        console.log('[CallContext] Received hang-up signal from other user:', data);
        endCall();
    });

    return () => {
      peer.destroy();
      socket.off('incoming-call');
      socket.off('call-accepted');
      socket.off('call-ended');
      socket.off('hang-up');
    };
  }, [socket, user]);
  
  useEffect(() => {
    if (peerRef.current && peerId && user && socket) {
      setIsPeerReady(true);
    } else {
      setIsPeerReady(false);
    }
  }, [peerRef.current, peerId, user, socket]);
  
  useEffect(() => {
    console.log('[CallContext] Call state changed:', { isCallActive, isCallInitiating });
    if (isCallActive || isCallInitiating) {
      // Use replace to avoid adding to history stack and triggering Fast Refresh
      if (window.location.pathname !== '/call') {
        console.log('[CallContext] Navigating to call page');
        router.replace('/call');
      }
    }
  }, [isCallActive, isCallInitiating, router]);
  
  // Prevent page refresh/navigation during active calls
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isCallActive || isCallInitiating) {
        e.preventDefault();
        e.returnValue = 'You have an active call. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isCallActive, isCallInitiating]);
  
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
        localStreamRef.current = stream; // Set ref immediately
        setIsCallInitiating(true);
        
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
            console.log('[CallContext] Got local stream for accepting call');
            setLocalStream(stream);
            localStreamRef.current = stream; // Set ref immediately
            setIsCallInitiating(true);

            // Let the caller know you accepted by emitting call-accepted signal
            socket.emit('call-accepted', { 
                receiver_peer_id: peerId,
                caller_peer_id: incomingCall.caller_peer_id 
            });
            
            setIncomingCall(null);
        });
  };
  
  const declineCall = () => {
      // In a real app, you might want to send a 'call-declined' signal
      setIncomingCall(null);
  }
  
  const endCall = () => {
      console.log('[CallContext] Ending call...');
      
      if (activeCall) {
        activeCall.close();
      }
      setIsCallActive(false);
      setIsCallInitiating(false);
      localStream?.getTracks().forEach(track => track.stop());
      setLocalStream(null);
      localStreamRef.current = null; // Clear ref
      setRemoteStream(null);
      setActiveCall(null);
      setIncomingCall(null);
      
      // Emit hang-up signal to notify the other user
      // Include the other user's ID if we have it
      const hangUpPayload = {
        receiver_id: incomingCall?.caller_id || null,
        caller_id: user?.id || null
      };
      console.log('[CallContext] Emitting hang-up signal:', hangUpPayload);
      socket.emit('hang-up', hangUpPayload);
  };

  const value = {
    localStream,
    remoteStream,
    isCallActive,
    isCallInitiating,
    incomingCall,
    startCall,
    endCall,
    acceptCall,
    declineCall,
    isPeerReady,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}; 