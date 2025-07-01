"use client";
import React from 'react';
import { PendingRequest } from '../../../lib/api/friendService';
import { Check, X, User } from 'lucide-react';

interface FriendRequestsDropdownProps {
  isOpen: boolean;
  requests: PendingRequest[];
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
  onClose: () => void;
}

const FriendRequestsDropdown: React.FC<FriendRequestsDropdownProps> = ({
  isOpen,
  requests,
  onAccept,
  onDecline,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute top-16 right-4 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800">Friend Requests</h3>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {requests.length > 0 ? (
          <ul>
            {requests.map(req => (
              <li key={req.request_id} className="p-4 border-b border-gray-100 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                     <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">
                      {req.requester_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-semibold text-sm text-gray-800">{req.requester_name}</p>
                        <p className="text-xs text-gray-500">{req.requester_email}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onAccept(req.request_id)}
                      className="p-1.5 text-green-600 bg-green-100 hover:bg-green-200 rounded-full transition-colors"
                      title="Accept"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDecline(req.request_id)}
                      className="p-1.5 text-red-600 bg-red-100 hover:bg-red-200 rounded-full transition-colors"
                      title="Decline"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-6 text-center">
            <p className="text-sm text-gray-500">No pending friend requests.</p>
          </div>
        )}
      </div>
      <div className="p-2 bg-gray-50 border-t border-gray-200">
        <button
          onClick={onClose}
          className="w-full text-center text-sm text-gray-600 hover:text-gray-800 py-1"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default FriendRequestsDropdown; 