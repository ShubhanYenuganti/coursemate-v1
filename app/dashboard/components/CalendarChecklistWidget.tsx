import React from 'react';
import TodaysChecklist from './TodaysChecklist';

interface ChecklistWidgetProps {
  onTaskToggle?: (taskId: number, checked: boolean) => void;
  onAddTask?: () => void;
}

const ChecklistWidget: React.FC<ChecklistWidgetProps> = ({
  onTaskToggle,
  onAddTask,
}) => {
  return (
    <div className="bg-orange-500 rounded-xl sm:rounded-2xl shadow-md p-3 sm:p-4 lg:p-6 flex flex-col w-full h-full" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Checklist */}
      <div className="w-full h-full">
          <TodaysChecklist />
      </div>
    </div>
  );
};

export default ChecklistWidget; 