"use client";
import React, { useState, useEffect } from 'react';
import { X, UserPlus, UserMinus, Crown, User as UserIcon, Search, Plus, Trash2 } from 'lucide-react';
import { messageService, GroupMember } from '../../../lib/api/messageService';
import { friendService } from '../../../lib/api/friendService';
import { User } from '../types';

interface ManageMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  currentUserId: string;
  onMembersChanged: () => void;
}

const ManageMembersModal: React.FC<ManageMembersModalProps> = ({
  isOpen,
  onClose,
  groupId,
  groupName,
  currentUserId,
  onMembersChanged
}) => {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAvailableUsers, setLoadingAvailableUsers] = useState(false);
  const [tab, setTab] = useState<'members' | 'add'>('members');

  useEffect(() => {
    if (isOpen) {
      loadMembers();
    }
  }, [isOpen]);

  // Only load available users when members change and we're on the add tab
  useEffect(() => {
    if (isOpen && tab === 'add' && members.length > 0) {
      loadAvailableUsers();
    }
  }, [members]); // Only depend on members, not tab

  const loadMembers = async () => {
    try {
      setLoading(true);
      const membersData = await messageService.getGroupMembers(groupId);
      setMembers(membersData);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      setLoadingAvailableUsers(true);
      // Get friends instead of all users
      const allFriends = await friendService.getFriendsForNewChat();
      // Filter out users who are already members
      const memberIds = members.map(m => m.user_id);
      const availableFriends = allFriends.filter(friend => !memberIds.includes(friend.id));
      
      // Convert Friend to User interface
      const available: User[] = availableFriends.map(friend => ({
        id: friend.id,
        name: friend.name,
        email: friend.email,
        status: 'offline' as const, // Default status since Friend interface doesn't have status
      }));
      
      setAvailableUsers(available);
    } catch (error) {
      console.error('Error loading available friends:', error);
    } finally {
      setLoadingAvailableUsers(false);
    }
  };

  const handleAddMembersTab = () => {
    setTab('add');
    loadAvailableUsers();
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;
    
    try {
      setLoading(true);
      const result = await messageService.addGroupMembers(groupId, selectedUsers);
      
      if (result.success) {
        setSelectedUsers([]);
        await loadMembers(); // This will trigger the useEffect to refresh available users
        onMembersChanged();
        setTab('members');
      }
    } catch (error) {
      console.error('Error adding members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    
    try {
      setLoading(true);
      const result = await messageService.removeGroupMember(groupId, userId);
      
      if (result.success) {
        await loadMembers(); // This will trigger the useEffect to refresh available users
        onMembersChanged();
      }
    } catch (error) {
      console.error('Error removing member:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAvailableUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentUserMember = members.find(m => m.user_id === currentUserId);
  const isCurrentUserAdmin = currentUserMember?.role === 'admin';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Manage Members</h2>
              <p className="text-sm text-gray-500">{groupName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setTab('members')}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              tab === 'members'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Members ({members.length})
          </button>
          {isCurrentUserAdmin && (
            <button
              onClick={handleAddMembersTab}
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                tab === 'add'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Add Members
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {tab === 'members' ? (
            /* Members List */
            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="p-6 text-center text-gray-500">Loading...</div>
              ) : members.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No members found</div>
              ) : (
                members.map((member) => (
                  <div key={member.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {member.user_name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900">{member.user_name}</h3>
                          {member.role === 'admin' && (
                            <Crown className="w-4 h-4 text-yellow-500" />
                          )}
                          {member.is_current_user && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">You</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{member.user_email}</p>
                      </div>
                    </div>
                    
                    {/* Remove button - only show for admins, and not for the current user */}
                    {isCurrentUserAdmin && !member.is_current_user && (
                      <button
                        onClick={() => handleRemoveMember(member.user_id)}
                        disabled={loading}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Remove member"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Add Members Tab */
            <div>
              {/* Search */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search friends..."
                    disabled={loadingAvailableUsers}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Available Users */}
              <div className="divide-y divide-gray-100">
                {loadingAvailableUsers ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading friends...</p>
                  </div>
                ) : filteredAvailableUsers.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p>No friends available to add</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {searchTerm ? 'Try a different search term' : 'All your friends are already members'}
                    </p>
                  </div>
                ) : (
                  filteredAvailableUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => {
                        setSelectedUsers(prev => 
                          prev.includes(user.id) 
                            ? prev.filter(id => id !== user.id)
                            : [...prev, user.id]
                        );
                      }}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedUsers.includes(user.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{user.name}</h3>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                        {selectedUsers.includes(user.id) && (
                          <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                            <Plus className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          {tab === 'add' && selectedUsers.length > 0 && (
            <button
              onClick={handleAddMembers}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add {selectedUsers.length} Member{selectedUsers.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageMembersModal;
