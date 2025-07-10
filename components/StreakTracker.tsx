"use client";
import { useEffect } from 'react';
import { userService } from '@/lib/api/userService';

const StreakTracker: React.FC = () => {
  useEffect(() => {
    const updateStreak = async () => {
      try {
        // Only update streak if user is authenticated
        const token = localStorage.getItem('token');
        if (token) {
          await userService.updateStreak();
        }
      } catch (error) {
        // Silently fail - streak tracking shouldn't break the app
        console.warn('Failed to update streak:', error);
      }
    };

    // Update streak on component mount (page visit)
    updateStreak();
  }, []);

  // This component doesn't render anything
  return null;
};

export default StreakTracker; 