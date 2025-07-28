import React from 'react';
import { Flame, Clock, BarChart2 } from 'lucide-react';

export interface AnalyticsCardData {
  id: number;
  icon: React.ReactNode;
  value: string;
  label: string;
  bgGradient: string;
}

interface AnalyticsCardsProps {
  analyticsData?: AnalyticsCardData[];
}

const defaultAnalytics: AnalyticsCardData[] = [
  {
    id: 1,
    icon: <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-white" />,
    value: '12',
    label: 'Day Study Streak',
    bgGradient: 'bg-indigo-500',
  },
  {
    id: 2,
    icon: <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />,
    value: '25.5 hrs',
    label: 'Hours Logged (Weekly)',
    bgGradient: 'bg-cyan-500',
  },
  {
    id: 3,
    icon: <BarChart2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />,
    value: '60%',
    label: 'Overall Completion',
    bgGradient: 'bg-emerald-500',
  },
];

const AnalyticsCards: React.FC<AnalyticsCardsProps> = ({ analyticsData = [] }) => {
  const dataToDisplay = analyticsData.length > 0 ? analyticsData : defaultAnalytics;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
      {dataToDisplay.map((item) => (
        <div
          key={item.id}
          className={`rounded-lg sm:rounded-xl p-3 sm:p-4 h-20 sm:h-24 flex items-center gap-3 sm:gap-4 ${item.bgGradient} shadow-lg`}
        >
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20">
            {item.icon}
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-lg sm:text-xl font-bold text-white leading-tight" style={{fontFamily: 'Inter, sans-serif'}}>{item.value}</span>
            <span className="text-[10px] sm:text-xs text-white font-medium mt-0.5 whitespace-nowrap opacity-80">{item.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AnalyticsCards;
