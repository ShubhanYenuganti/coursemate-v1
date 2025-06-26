"use client";
import { useCall } from "@/app/context/CallContext";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export default function CallPage() {
  const { localStream, remoteStream, isCallActive, endCall } = useCall();
  const router = useRouter();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isCallActive) {
      router.replace("/chat");
    }
  }, [isCallActive, router]);

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
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
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
        <button
          onClick={endCall}
          className="p-3 bg-red-600 text-white rounded-full hover:bg-red-700"
        >
          End Call
        </button>
      </div>
    </div>
  );
} 