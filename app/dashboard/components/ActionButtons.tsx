import React from 'react';

interface ActionButtonsProps {
  onAddTask?: () => void;
  onAddCourse?: () => void;
  onJoinStudyGroup?: () => void;
  onViewCalendar?: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ 
  onAddTask,
  onAddCourse,
  onJoinStudyGroup,
  onViewCalendar
}) => {
  const buttons = [
    {
      icon: '📝',
      label: 'Add Task',
      onClick: onAddTask,
      className: 'bg-indigo-500 hover:bg-indigo-600'
    },
    {
      icon: '➕',
      label: 'Add Course',
      onClick: onAddCourse,
      className: 'bg-emerald-500 hover:bg-emerald-600'
    },
    {
      icon: '👥',
      label: 'Join Study Group',
      onClick: onJoinStudyGroup,
      className: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      icon: '📅',
      label: 'View Full Calendar',
      onClick: onViewCalendar,
      className: 'bg-gray-600 hover:bg-gray-700'
    }
  ];

  return (
    <div className="flex gap-3 mb-6 flex-wrap">
      {buttons.map((button, index) => (
        <button
          key={index}
          onClick={button.onClick}
          className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium transition-colors ${button.className}`}
        >
          {button.icon} {button.label}
        </button>
      ))}
    </div>
  );
};

export default ActionButtons; 