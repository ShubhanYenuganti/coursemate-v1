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
  resources?: Array<{ type: 'link' | 'image' | 'file'; url: string; name?: string }>;
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
    resources: [
      { type: 'link', url: 'https://example.com/resource1', name: 'Assignment PDF' },
      { type: 'image', url: 'https://placekitten.com/300/200', name: 'Screenshot' },
      { type: 'file', url: '/files/notes.pdf', name: 'Notes.pdf' },
    ],
    },
    {
      id: 2,
    user: 'David Lee',
    avatar: 'DL',
    action: 'shared a resource in',
    target: 'Physics Help Forum',
    time: '1 hour ago',
    type: 'resource',
    resources: [
      { type: 'link', url: 'https://example.com/physics', name: 'Physics Resource' },
    ],
    },
    {
      id: 3,
    user: 'Video Resource',
    avatar: '📺',
    title: 'Useful Video on Thermodynamics',
    action: 'Watch Video',
    time: '2 hours ago',
    type: 'video',
    resources: [
      { type: 'link', url: 'https://youtube.com', name: 'Watch on YouTube' },
    ],
  },
];

const CommunityActivity: React.FC<CommunityActivityProps> = ({
  activities = [],
  onFilterChange,
  onActivityClick,
}) => {
  const [modalActivity, setModalActivity] = useState<Activity | null>(null);

  const activitiesToDisplay = activities.length > 0 ? activities : defaultActivities;

  const handleActivityClick = (activity: Activity) => {
    setModalActivity(activity);
    onActivityClick && onActivityClick(activity);
  };

  const handleCloseModal = () => setModalActivity(null);

  const getAvatarColor = (avatar: string) => {
    if (avatar === '📺') return 'bg-indigo-500';
    // You can add more logic here for different avatar colors
    return 'bg-indigo-500';
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm relative">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-semibold text-gray-800">Notifications</h2>
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
      {/* Modal for Activity Details */}
      {modalActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-lg relative">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={handleCloseModal}
              aria-label="Close"
            >
              &times;
            </button>
            <div className="flex items-center mb-4">
              <div className={`w-10 h-10 ${getAvatarColor(modalActivity.avatar)} rounded-full flex items-center justify-center text-white text-lg font-bold mr-4`}>
                {modalActivity.avatar}
              </div>
              <div>
                <div className="font-semibold text-gray-800 text-lg">
                  {modalActivity.user || modalActivity.title}
                </div>
                <div className="text-xs text-gray-500">{modalActivity.time}</div>
              </div>
            </div>
            <div className="mb-4">
              {modalActivity.content && (
                <div className="text-gray-700 text-base mb-2 whitespace-pre-line">
                  {modalActivity.content}
                </div>
              )}
              {modalActivity.type === 'video' && (
                <div className="text-indigo-500 text-base mb-2">{modalActivity.title}</div>
              )}
              <div className="text-xs text-gray-500 mb-2">{modalActivity.action} {modalActivity.target && <span className="text-indigo-500">{modalActivity.target}</span>}</div>
            </div>
            {/* Resources */}
            {modalActivity.resources && modalActivity.resources.length > 0 && (
              <div className="mb-4">
                <div className="font-semibold text-gray-700 mb-2">Resources:</div>
                <ul className="space-y-2">
                  {modalActivity.resources.map((res, idx) => (
                    <li key={idx}>
                      {res.type === 'link' && (
                        <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">
                          🔗 {res.name || res.url}
                        </a>
                      )}
                      {res.type === 'image' && (
                        <div>
                          <img src={res.url} alt={res.name || 'Resource Image'} className="rounded-lg max-h-48 mb-1" />
                          <div className="text-xs text-gray-500">{res.name}</div>
                        </div>
                      )}
                      {res.type === 'file' && (
                        <a href={res.url} download className="text-green-600 hover:underline">
                          📄 {res.name || 'Download file'}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
      </div>
      )}
    </div>
  );
};

export default CommunityActivity;
