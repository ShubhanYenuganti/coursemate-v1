import React, { useEffect, useState } from 'react';
import { Friend, UserSummary } from '../../../lib/api/friendService';
import { useSocket } from '@/app/context/SocketContext';

interface EnrolledUsersListProps {
  courseId: string;
  isCreator: boolean;
}

// We'll use UserSummary for enrolled users
const EnrolledUsersList: React.FC<EnrolledUsersListProps> = ({ courseId, isCreator }) => {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { socket } = useSocket();

  const fetchEnrolledUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/notifications/course/${courseId}/enrolled-users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.enrolled_users);
      } else {
        setError(data.error || 'Failed to load enrolled users');
      }
    } catch (err) {
      setError('Failed to load enrolled users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isCreator) fetchEnrolledUsers();
    // eslint-disable-next-line
  }, [courseId, isCreator]);

  useEffect(() => {
    if (!socket) return;
    const handleUserRemoved = (data: { course_id: string; removed_by: string }) => {
      if (data.course_id === courseId) {
        fetchEnrolledUsers();
      }
    };
    socket.on('course_user_removed', handleUserRemoved);
    return () => {
      socket.off('course_user_removed', handleUserRemoved);
    };
  }, [socket, courseId]);

  const handleRemove = async (userId: string) => {
    if (!window.confirm('Remove this user from the course?')) return;
    try {
      const res = await fetch(`/api/notifications/course/${courseId}/remove-user/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setUsers(users.filter(u => u.id !== userId));
      } else {
        alert(data.error || 'Failed to remove user');
      }
    } catch (err) {
      alert('Failed to remove user');
    }
  };

  if (!isCreator) return null;
  if (loading) return <div className="my-4 text-gray-500">Loading enrolled users…</div>;
  if (error) return <div className="my-4 text-red-500">{error}</div>;
  if (users.length === 0) return <div className="my-4 text-gray-400">No friends enrolled yet.</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Enrolled Friends</h2>
      <ul className="space-y-2">
        {users.map(user => (
          <li key={user.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div>
              <span className="font-medium text-gray-800">{user.name}</span>
              <span className="text-sm text-gray-600 ml-2">({user.email})</span>
            </div>
            <button
              onClick={() => handleRemove(user.id)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default EnrolledUsersList; 