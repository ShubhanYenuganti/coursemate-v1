"use client";

import React, { useEffect, useRef } from 'react';
import { useCall } from '@/app/context/CallContext';
import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';

const CallModal = () => {
  const { localStream, remoteStream, isCallActive, endCall } = useCall();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!isCallActive) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center z-50">
      {/* Remote Video */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />

      {/* Local Video Preview */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className="absolute bottom-5 right-5 w-48 h-32 object-cover border-2 border-white rounded-lg shadow-lg"
      />

      {/* Call Controls */}
      <div className="absolute bottom-10 flex gap-4">
        <button className="p-3 bg-gray-600 bg-opacity-50 text-white rounded-full hover:bg-gray-700">
            <Mic className="w-6 h-6" />
        </button>
         <button className="p-3 bg-gray-600 bg-opacity-50 text-white rounded-full hover:bg-gray-700">
            <Video className="w-6 h-6" />
        </button>
        <button 
            onClick={endCall}
            className="p-3 bg-red-600 text-white rounded-full hover:bg-red-700"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default CallModal; 