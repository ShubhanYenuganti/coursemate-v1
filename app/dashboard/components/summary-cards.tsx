import React from 'react';

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

const defaultAnalytics: AnalyticsCardData[] = [
  {
    id: 1,
    icon: '🔥',
    value: '12',
    label: 'Day Study Streak',
    bgColor: 'bg-orange-100',
    iconColor: 'text-orange-500',
    gradient: 'from-orange-400 to-orange-500',
  },
  {
    id: 2,
    icon: '⏰',
    value: '25.5 hrs',
    label: 'Hours Logged (Weekly)',
    bgColor: 'bg-emerald-100',
    iconColor: 'text-emerald-500',
    gradient: 'from-emerald-400 to-emerald-500',
  },
  {
    id: 3,
    icon: '📊',
    value: '60%',
    label: 'Overall Completion',
    bgColor: 'bg-indigo-100',
    iconColor: 'text-indigo-500',
    gradient: 'from-indigo-400 to-indigo-500',
  },
  {
    id: 4,
    icon: '🏆',
    value: '5',
    label: 'Achievements Unlocked',
    bgColor: 'bg-amber-100',
    iconColor: 'text-amber-500',
    gradient: 'from-amber-400 to-amber-500',
  },
];

const AnalyticsCards: React.FC<AnalyticsCardsProps> = ({ analyticsData = [] }) => {
  const dataToDisplay = analyticsData.length > 0 ? analyticsData : defaultAnalytics;

  return (
    <div className="grid grid-cols-4 gap-4">
      {dataToDisplay.map(item => (
        <div
          key={item.id}
          className="relative overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-10`} />
          <div className="relative bg-white/80 backdrop-blur-sm p-3 flex flex-row items-center gap-3">
            <div className={`w-10 h-10 ${item.bgColor} ${item.iconColor} rounded-lg flex items-center justify-center text-xl flex-shrink-0`}>
              {item.icon}
            </div>
            <div className="flex flex-col items-start">
              <div className="text-xl font-bold text-gray-800">
                {item.value}
              </div>
              <div className="text-xs text-gray-600">
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
