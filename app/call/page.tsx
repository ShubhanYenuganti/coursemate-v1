"use client";
import { useCall } from "@/app/context/CallContext";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export default function CallPage() {
  const { localStream, remoteStream, isCallActive, isCallInitiating, endCall } = useCall();
  const router = useRouter();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isCallActive && !isCallInitiating) {
      router.replace("/chat");
    }
  }, [isCallActive, isCallInitiating, router]);

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

  if (!isCallActive && !isCallInitiating) return null;

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
      {/* Remote Video */}
      {remoteStream ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center text-white">
            <div className="w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Waiting for other user...</h2>
            <p className="text-gray-300">The call will start when they join</p>
          </div>
        </div>
      )}

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
        <button
          onClick={endCall}
          className="p-3 bg-red-600 text-white rounded-full hover:bg-red-700"
        >
          {isCallInitiating && !isCallActive ? 'Cancel Call' : 'End Call'}
        </button>
      </div>
    </div>
  );
} 