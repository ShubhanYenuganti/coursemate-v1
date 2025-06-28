"use client";
import React, { useState, useEffect } from 'react';
import { X, UserPlus, Search, Send, UserCheck } from 'lucide-react';
import { friendService, UserSummary } from '../../../lib/api/friendService';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFriendRequestSent: (user: UserSummary) => void;
}

const AddFriendModal: React.FC<AddFriendModalProps> = ({ isOpen, onClose, onFriendRequestSent }) => {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const fetchUsers = async () => {
        setIsLoading(true);
        try {
          const findableUsers = await friendService.findNewFriends();
          setUsers(findableUsers);
        } catch (error) {
          console.error("Failed to fetch users:", error);
          setUsers([]);
        } finally {
          setIsLoading(false);
        }
      };
      fetchUsers();
    }
  }, [isOpen]);

  const handleSendRequest = async (user: UserSummary) => {
    setSentRequests(prev => new Set(prev).add(user.id));
    try {
      await friendService.sendFriendRequest(user.id);
      onFriendRequestSent(user);
    } catch (error) {
      console.error(`Failed to send friend request to ${user.name}:`, error);
      // Optionally revert the button state on error
      setSentRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(user.id);
        return newSet;
      });
    }
  };
  
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 flex flex-col" style={{height: '70vh'}}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Find New Friends</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        {/* User List */}
        <div className="flex-grow overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Loading users...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            <ul className="space-y-2">
              {filteredUsers.map(user => (
                <li key={user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSendRequest(user)}
                    disabled={sentRequests.has(user.id)}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center disabled:opacity-70 disabled:cursor-not-allowed
                               bg-green-100 text-green-700 hover:bg-green-200
                               disabled:bg-gray-200 disabled:text-gray-500"
                  >
                    {sentRequests.has(user.id) ? (
                      <>
                        <UserCheck className="w-4 h-4 mr-1.5" />
                        Sent
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-1.5" />
                        Add
                      </>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
             <div className="text-center py-8">
                <p className="text-sm text-gray-600">No users found.</p>
             </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Close
            </button>
        </div>
      </div>
    </div>
  );
};

export default AddFriendModal; 