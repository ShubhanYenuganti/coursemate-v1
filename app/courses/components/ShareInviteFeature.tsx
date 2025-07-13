import React, { useState, useEffect } from "react";
import { Course } from "./CourseCard";
import { friendService, Friend } from "../../../lib/api/friendService";
import { notificationService } from "../../../lib/api/notificationService";
import { courseService } from "../../../lib/api/courseService";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '../../../components/ui/alert-dialog';

const ROLES = ["Enrolled", "Creator"] as const;
type Role = typeof ROLES[number];

const VISIBILITY_OPTIONS = [
  { value: "Private", label: "Private", description: "Only you can see this course" },
  { value: "Friends Only", label: "Friends Only", description: "Only your friends can see this course" },
  { value: "Public", label: "Public", description: "Anyone can discover and view this course" }
] as const;

const ShareInviteFeature: React.FC<{ course: Course }> = ({ course }) => {
  const [selectedFriendId, setSelectedFriendId] = useState<string>("");
  const [role, setRole] = useState<Role>("Enrolled");
  const [visibility, setVisibility] = useState<string>(course.visibility || "Private");
  const [inviteLink] = useState<string>(`https://coursemate.app/invite/${course.dbId}`);
  const [invited, setInvited] = useState<{ friendId: string; friendName: string; role: Role }[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isLoadingInvite, setIsLoadingInvite] = useState(false);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingVisibility, setPendingVisibility] = useState<string | null>(null);

  // Load friends list
  useEffect(() => {
    const loadFriends = async () => {
      setIsLoadingFriends(true);
      try {
        const friendsList = await friendService.getFriends();
        setFriends(friendsList);
      } catch (error) {
        console.error('Failed to load friends:', error);
        setError('Failed to load friends list');
      } finally {
        setIsLoadingFriends(false);
      }
    };

    loadFriends();
  }, []);

  const handleInvite = async () => {
    if (!selectedFriendId.trim()) {
      setError("Please select a friend to invite");
      return;
    }

    setIsLoadingInvite(true);
    setError("");
    setSuccess("");

    try {
      const selectedFriend = friends.find(f => f.id === selectedFriendId);
      if (!selectedFriend) {
        throw new Error("Selected friend not found");
      }

      // Use combo_id if available, otherwise fallback to dbId
      const courseIdToSend = (course as any).combo_id || course.dbId;
      await notificationService.sendCourseInvite(course.comboId, selectedFriendId, role);
      
      setInvited([...invited, { 
        friendId: selectedFriendId, 
        friendName: selectedFriend.name, 
        role 
      }]);
      setSelectedFriendId("");
      setRole("Enrolled");
      setSuccess(`Invitation sent to ${selectedFriend.name}!`);
    } catch (error) {
      console.error('Failed to send invite:', error);
      setError(error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setIsLoadingInvite(false);
    }
  };

  const handleUpdateVisibility = async (overrideVisibility?: string) => {
    setIsUpdatingVisibility(true);
    setError("");
    setSuccess("");
    const vis = overrideVisibility || visibility;
    try {
      if (vis === 'Private' && course.visibility !== 'Private') {
        // Call backend with confirm_remove flag
        const res = await fetch(`/api/notifications/course/${course.dbId}/update-visibility`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}`,
          },
          body: JSON.stringify({ visibility: vis, confirm_remove: true })
        });
        const data = await res.json();
        if (data.success) {
          setSuccess('Course visibility updated successfully!');
        } else {
          setError(data.error || 'Failed to update visibility');
        }
      } else {
        await courseService.updateCourse(course.dbId, { visibility: vis as "Private" | "Friends Only" | "Public" | "Only Me" });
        setSuccess("Course visibility updated successfully!");
      }
    } catch (error) {
      console.error('Failed to update visibility:', error);
      setError(error instanceof Error ? error.message : 'Failed to update visibility');
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setSuccess("Invite link copied to clipboard!");
    setTimeout(() => setSuccess(""), 3000);
  };

  const removeInvited = (friendId: string) => {
    setInvited(invited.filter(inv => inv.friendId !== friendId));
  };

  const handleVisibilityChange = (newVisibility: string) => {
    if (newVisibility === 'Private' && visibility !== 'Private') {
      setPendingVisibility(newVisibility);
      setShowConfirm(true);
    } else {
      setVisibility(newVisibility);
    }
  };

  const handleConfirmVisibility = () => {
    setVisibility(pendingVisibility!);
    setShowConfirm(false);
    handleUpdateVisibility(pendingVisibility!);
    setPendingVisibility(null);
  };

  const handleCancelVisibility = () => {
    setShowConfirm(false);
    setPendingVisibility(null);
  };

  return (
    <div className="my-8">
      <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">Share / Invite</h3>
      
      {/* Error and Success Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      {/* Course Visibility Settings */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-800 mb-3">Course Visibility</h4>
        <div className="space-y-3">
          {VISIBILITY_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="visibility"
                value={option.value}
                checked={visibility === option.value}
                onChange={() => handleVisibilityChange(option.value)}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-gray-800">{option.label}</div>
                <div className="text-sm text-gray-600">{option.description}</div>
              </div>
            </label>
          ))}
        </div>
        <button
          onClick={() => handleUpdateVisibility()}
          disabled={isUpdatingVisibility}
          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {isUpdatingVisibility ? "Updating..." : "Update Visibility"}
        </button>
      </div>
      {/* Confirmation Modal for Private Visibility */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch to Private?</AlertDialogTitle>
            <AlertDialogDescription>
              Switching to Private will remove all enrolled friends from this course. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelVisibility} disabled={isUpdatingVisibility}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmVisibility} disabled={isUpdatingVisibility}>
              {isUpdatingVisibility ? 'Updating...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite Friends Section */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-800 mb-3">Invite Friends</h4>
        <div className="flex flex-col sm:flex-row gap-4 items-start mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Friend</label>
            <select
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedFriendId}
              onChange={(e) => setSelectedFriendId(e.target.value)}
              disabled={isLoadingFriends}
            >
              <option value="">Choose a friend...</option>
              {friends.map((friend) => (
                <option key={friend.id} value={friend.id}>
                  {friend.name} ({friend.email})
                </option>
              ))}
            </select>
            {isLoadingFriends && <p className="text-sm text-gray-500 mt-1">Loading friends...</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          
          <button
            onClick={handleInvite}
            disabled={!selectedFriendId || isLoadingInvite}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
          >
            {isLoadingInvite ? "Sending..." : "Send Invite"}
          </button>
        </div>
      </div>

      {/* Invite Link Section */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-800 mb-3">Invite Link</h4>
        <div className="flex items-center gap-2">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-lg p-2 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={inviteLink}
            readOnly
          />
          <button
            onClick={handleCopyLink}
            className="px-4 py-2 bg-gray-200 rounded-lg text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
          >
            Copy Link
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Share this link with anyone to invite them to your course
        </p>
      </div>

      {/* Invited Friends List */}
      {invited.length > 0 && (
        <div className="mt-6">
          <h4 className="font-semibold text-gray-800 mb-3">Invited Friends</h4>
          <div className="space-y-2">
            {invited.map((inv) => (
              <div key={inv.friendId} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <span className="font-medium text-gray-800">{inv.friendName}</span>
                  <span className="text-sm text-gray-600 ml-2">({inv.role})</span>
                </div>
                <button
                  onClick={() => removeInvited(inv.friendId)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Friends Message */}
      {!isLoadingFriends && friends.length === 0 && (
        <div className="text-center py-6 text-gray-500">
          <p className="mb-2">You don't have any friends yet.</p>
          <p className="text-sm">Add friends to invite them to your courses!</p>
        </div>
      )}
    </div>
  );
};

export default ShareInviteFeature; 