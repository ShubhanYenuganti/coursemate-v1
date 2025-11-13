import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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

interface LeaveCourseButtonProps {
  courseId: string;
}

const LeaveCourseButton: React.FC<LeaveCourseButtonProps> = ({ courseId }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLeave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications/course/${courseId}/remove-user/me`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        router.push('/courses');
      } else {
        alert(data.error || 'Failed to leave course');
      }
    } catch (err) {
      alert('Failed to leave course');
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="flex flex-col items-start">
      <h2 className="text-2xl font-bold mb-6">Course Actions</h2>
      <button
        className="px-4 py-2 text-sm rounded-md border border-red-300 text-red-600 bg-white hover:bg-red-50 transition-colors shadow-sm"
        onClick={() => setShowConfirm(true)}
        disabled={loading}
      >
        Leave Course
      </button>
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Course?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this course? You will lose access to all its materials and progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeave} disabled={loading}>
              {loading ? 'Leaving...' : 'Leave'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LeaveCourseButton; 