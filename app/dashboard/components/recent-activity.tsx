import React, { useState } from 'react';

export interface Activity {
  id: number;
  user?: string;
  avatar: string;
  action: string;
  target?: string;
  content?: string;
  time: string;
  type: 'post' | 'resource' | 'video';
  title?: string;
}

interface CommunityActivityProps {
  activities?: Activity[];
  onFilterChange?: (filter: string) => void;
  onActivityClick?: (activity: Activity) => void;
}

const defaultActivities: Activity[] = [
  {
    id: 1,
    user: 'Priya Patel',
    avatar: 'PP',
    action: 'posted in',
    target: 'Calculus Study Group',
    content: '"Anyone else stuck on problem 5 of the latest assignment? Would love some hints!"',
    time: '25 min ago',
    type: 'post',
  },
  {
    id: 2,
    user: 'David Lee',
    avatar: 'DL',
    action: 'shared a resource in',
    target: 'Physics Help Forum',
    time: '1 hour ago',
    type: 'resource',
  },
  {
    id: 3,
    user: 'Video Resource',
    avatar: '📺',
    title: 'Useful Video on Thermodynamics',
    action: 'Watch Video',
    time: '2 hours ago',
    type: 'video',
  },
];

const CommunityActivity: React.FC<CommunityActivityProps> = ({
  activities = [],
  onFilterChange,
  onActivityClick,
}) => {
  const [selectedFilter, setSelectedFilter] = useState('All Activity');

  const activitiesToDisplay = activities.length > 0 ? activities : defaultActivities;

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedFilter(value);
    onFilterChange && onFilterChange(value);
  };

  const handleActivityClick = (activity: Activity) => {
    onActivityClick && onActivityClick(activity);
  };

  const getAvatarColor = (avatar: string) => {
    if (avatar === '📺') return 'bg-indigo-500';
    // You can add more logic here for different avatar colors
    return 'bg-indigo-500';
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-semibold text-gray-800">Community Activity</h2>
        <select
          value={selectedFilter}
          onChange={handleFilterChange}
          className="border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="All Activity">All Activity</option>
          <option value="Posts">Posts</option>
          <option value="Resources">Resources</option>
          <option value="Videos">Videos</option>
        </select>
      </div>
      {/* Activity List */}
      {activitiesToDisplay.map(activity => (
        <div
          key={activity.id}
          onClick={() => handleActivityClick(activity)}
          className="flex items-start py-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors rounded-lg"
        >
          {/* Avatar */}
          <div className={`w-8 h-8 ${getAvatarColor(activity.avatar)} rounded-full flex items-center justify-center text-white text-xs font-bold mr-3 flex-shrink-0`}>
            {activity.avatar}
          </div>
          {/* Content */}
          <div className="flex-1">
            {activity.type === 'video' ? (
              // Video/Resource Format
              <>
                <div className="text-sm text-indigo-500 mb-1 hover:text-indigo-600">
                  "{activity.title}"
                </div>
                <div className="text-xs text-gray-500">{activity.action}</div>
              </>
            ) : (
              // Regular Activity Format
              <>
                <div className="text-sm text-gray-700 mb-1">
                  <strong>{activity.user}</strong> {activity.action}{' '}
                  <span className="text-indigo-500 hover:text-indigo-600">
                    {activity.target}
                  </span>
                </div>
                {activity.content && (
                  <div className="text-xs text-gray-600 mb-1 italic">
                    {activity.content}
                  </div>
                )}
                <div className="text-xs text-gray-500">{activity.time}</div>
              </>
            )}
          </div>
        </div>
      ))}
      {/* Empty State */}
      {activitiesToDisplay.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">💬</div>
          <p className="mb-2">No community activity yet</p>
          <p className="text-xs">Join a study group to see activity here</p>
        </div>
      )}
    </div>
  );
};

export default CommunityActivity;
