"use client";

import React from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { useCall } from '@/app/context/CallContext';

const IncomingCallToast = () => {
    const { incomingCall, acceptCall, declineCall } = useCall();

    if (!incomingCall) return null;

    return (
        <div className="fixed bottom-5 right-5 bg-white shadow-2xl rounded-lg p-6 w-80 animate-pulse">
            <div className="text-center">
                <p className="font-semibold text-gray-800">{incomingCall.caller_name}</p>
                <p className="text-sm text-gray-500 mb-4">is calling you...</p>
            </div>
            <div className="flex justify-center gap-4">
                <button
                    onClick={acceptCall}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                    <Phone className="w-4 h-4" />
                    Accept
                </button>
                <button
                    onClick={declineCall}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                    <PhoneOff className="w-4 h-4" />
                    Decline
                </button>
            </div>
        </div>
    );
};

export default IncomingCallToast; 