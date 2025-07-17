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
    <div className="bg-orange-500 rounded-2xl shadow-md p-6 flex flex-col w-full" style={{ fontFamily: 'Inter, sans-serif', height: '510px' }}>
      {/* Checklist */}
      <div className="w-full">
          <TodaysChecklist />
      </div>
    </div>
  );
};

export default ChecklistWidget; 