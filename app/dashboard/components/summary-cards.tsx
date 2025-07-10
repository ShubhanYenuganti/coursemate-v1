"use client";
import React, { useState, useEffect } from 'react';
import { userService, StreakData, WeeklyHoursData } from '../../../lib/api/userService';

export interface AnalyticsCardData {
  id: number;
  icon: string;
  value: string;
  label: string;
  bgColor: string;
  iconColor: string;
  gradient: string;
}

interface AnalyticsCardsProps {
  analyticsData?: AnalyticsCardData[];
}

const AnalyticsCards: React.FC<AnalyticsCardsProps> = ({ analyticsData = [] }) => {
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [weeklyHoursData, setWeeklyHoursData] = useState<WeeklyHoursData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (token) {
          // Fetch both streak and weekly hours data in parallel
          const [streakData, weeklyHoursData] = await Promise.all([
            userService.getStreakData(),
            userService.getWeeklyHours()
          ]);
          
          setStreakData(streakData);
          setWeeklyHoursData(weeklyHoursData);
        }
      } catch (error) {
        console.warn('Failed to fetch analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStreakColor = (streak: number) => {
    if (streak === 0) return { bg: 'bg-gradient-to-br from-red-100 to-pink-100', icon: 'text-red-500', gradient: 'from-red-400 to-pink-500' };
    if (streak < 7) return { bg: 'bg-gradient-to-br from-orange-100 to-red-100', icon: 'text-orange-600', gradient: 'from-orange-400 to-red-500' };
    if (streak < 30) return { bg: 'bg-gradient-to-br from-yellow-100 to-orange-100', icon: 'text-yellow-600', gradient: 'from-yellow-400 to-orange-500' };
    if (streak < 100) return { bg: 'bg-gradient-to-br from-green-100 to-emerald-100', icon: 'text-green-600', gradient: 'from-green-400 to-emerald-500' };
    return { bg: 'bg-gradient-to-br from-purple-100 to-indigo-100', icon: 'text-purple-600', gradient: 'from-purple-400 to-indigo-500' };
  };

  const getWeeklyHoursColor = (hours: number) => {
    if (hours === 0) return { bg: 'bg-gradient-to-br from-blue-100 to-cyan-100', icon: 'text-blue-500', gradient: 'from-blue-400 to-cyan-500' };
    if (hours < 10) return { bg: 'bg-gradient-to-br from-emerald-100 to-teal-100', icon: 'text-emerald-600', gradient: 'from-emerald-400 to-teal-500' };
    if (hours < 20) return { bg: 'bg-gradient-to-br from-indigo-100 to-purple-100', icon: 'text-indigo-600', gradient: 'from-indigo-400 to-purple-500' };
    if (hours < 30) return { bg: 'bg-gradient-to-br from-violet-100 to-purple-100', icon: 'text-violet-600', gradient: 'from-violet-400 to-purple-500' };
    return { bg: 'bg-gradient-to-br from-amber-100 to-yellow-100', icon: 'text-amber-600', gradient: 'from-amber-400 to-yellow-500' };
  };

  const defaultAnalytics: AnalyticsCardData[] = [
    {
      id: 1,
      icon: '🔥',
      value: loading ? '...' : (streakData?.current_streak || '0').toString(),
      label: 'Day Study Streak',
      bgColor: loading ? 'bg-gray-100' : getStreakColor(streakData?.current_streak || 0).bg,
      iconColor: loading ? 'text-gray-500' : getStreakColor(streakData?.current_streak || 0).icon,
      gradient: loading ? 'from-gray-400 to-gray-500' : getStreakColor(streakData?.current_streak || 0).gradient,
    },
    {
      id: 2,
      icon: '⏰',
      value: loading ? '...' : `${weeklyHoursData?.weekly_hours || 0} hrs`,
      label: 'Hours Logged (Weekly)',
      bgColor: loading ? 'bg-gray-100' : getWeeklyHoursColor(weeklyHoursData?.weekly_hours || 0).bg,
      iconColor: loading ? 'text-gray-500' : getWeeklyHoursColor(weeklyHoursData?.weekly_hours || 0).icon,
      gradient: loading ? 'from-gray-400 to-gray-500' : getWeeklyHoursColor(weeklyHoursData?.weekly_hours || 0).gradient,
    },
  ];

  const dataToDisplay = analyticsData.length > 0 ? analyticsData : defaultAnalytics;

  return (
    <div className="grid grid-cols-2 gap-4">
      {dataToDisplay.map(item => (
        <div
          key={item.id}
          className="relative overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-20`} />
          <div className="relative bg-white/90 backdrop-blur-sm p-4 flex flex-row items-center gap-3">
            <div className={`w-12 h-12 ${item.bgColor} ${item.iconColor} rounded-xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm`}>
              {item.icon}
            </div>
            <div className="flex flex-col items-start">
              <div className="text-2xl font-bold text-gray-800">
                {item.value}
              </div>
              <div className="text-sm text-gray-600 font-medium">
                {item.label}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AnalyticsCards;
