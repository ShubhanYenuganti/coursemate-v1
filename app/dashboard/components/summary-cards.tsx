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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {dataToDisplay.map(item => (
        <div
          key={item.id}
          className="relative rounded-xl bg-white/70 backdrop-blur-md border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-row items-center py-3 px-3 group min-w-[160px]"
        >
          {/* Accent dot */}
          <div className={`absolute top-2 left-2 w-2 h-2 rounded-full ${item.iconColor} opacity-80 group-hover:scale-110 transition-transform`} />
          {/* Icon */}
          <div className={`w-8 h-8 ${item.bgColor} ${item.iconColor} rounded-lg flex items-center justify-center text-xl mr-3 shadow-sm`}>
            {item.icon}
          </div>
          {/* Value and Label */}
          <div className="flex flex-col items-start justify-center">
            <div className="text-lg font-bold text-gray-800 leading-tight">
              {item.value}
            </div>
            <div className="text-xs text-gray-500 font-medium leading-tight">
              {item.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AnalyticsCards;
