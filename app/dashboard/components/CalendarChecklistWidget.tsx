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
    <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col w-full max-w-2xl mx-auto">
      {/* Checklist */}
      <div className="w-full">
          <TodaysChecklist />
      </div>
    </div>
  );
};

export default ChecklistWidget; 