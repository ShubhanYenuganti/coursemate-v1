"use client";

import React, { useState, useEffect } from 'react';
import { X, Users, Search, Check } from 'lucide-react';
import { friendService, Friend } from '../../../lib/api/friendService';

interface GroupChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (groupName: string, selectedUsers: string[]) => void;
}

const GroupChatModal: React.FC<GroupChatModalProps> = ({
  isOpen,
  onClose,
  onCreateGroup
}) => {
  const [groupName, setGroupName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [availableFriends, setAvailableFriends] = useState<Friend[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      console.log('🔍 [GroupChatModal] Fetching friends for group chat...');
      const friends = await friendService.getFriends();
      console.log('✅ [GroupChatModal] Friends fetched:', friends);
      setAvailableFriends(friends || []);
    } catch (error) {
      console.error('❌ [GroupChatModal] Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
      setGroupName('');
      setSearchTerm('');
      setSelectedUsers(new Set());
    }
  }, [isOpen]);

  const filteredUsers = availableFriends.filter((friend: Friend) =>
    friend.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const handleCreateGroup = () => {
    if (groupName.trim() && selectedUsers.size > 0) {
      console.log('📝 [GroupChatModal] Creating group:', { groupName: groupName.trim(), selectedUsers: Array.from(selectedUsers) });
      onCreateGroup(groupName.trim(), Array.from(selectedUsers));
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Create Group Chat</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Group Name Input */}
        <div className="p-6 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Group Name
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter group name..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            maxLength={50}
          />
          <p className="text-xs text-gray-500 mt-1">
            {groupName.length}/50 characters
          </p>
        </div>

        {/* User Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {selectedUsers.size > 0 && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
              </p>
            </div>
          )}
        </div>

        {/* Friends List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading your friends...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'No friends match your search' : availableFriends.length === 0 ? 'No friends available. Add friends first to create group chats.' : 'No friends found'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((friend: Friend) => (
                <div
                  key={friend.id}
                  className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    selectedUsers.has(friend.id)
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => toggleUserSelection(friend.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {friend.name.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{friend.name}</h3>
                      <p className="text-sm text-gray-500">{friend.email}</p>
                    </div>
                  </div>
                  
                  {selectedUsers.has(friend.id) && (
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Select users to add to the group chat
            </p>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedUsers.size === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupChatModal;
