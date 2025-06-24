"use client";
import React, { useState } from 'react';
import { X, Calendar, Plus, Trash2, Edit3 } from 'lucide-react';
import { Task, Subtask } from './types';

interface TaskEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  subtasks: Subtask[];
  onSave: (task: Task, subtasks: Subtask[]) => void;
}

const TaskEditorModal: React.FC<TaskEditorModalProps> = ({ 
  isOpen, 
  onClose, 
  task, 
  subtasks: initialSubtasks, 
  onSave 
}) => {
  const [taskData, setTaskData] = useState<Task | null>(task);
  const [subtasks, setSubtasks] = useState<Subtask[]>(initialSubtasks);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (task) {
      setTaskData(task);
      setSubtasks(initialSubtasks);
    }
  }, [task, initialSubtasks]);

  const handleSave = async () => {
    if (!taskData) return;
    
    setIsSubmitting(true);
    try {
      onSave(taskData, subtasks);
      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSubtask = () => {
    if (!taskData) return;
    
    const newSubtask: Subtask = {
      id: Date.now().toString(),
      taskId: taskData.id,
      name: '',
      type: 'other',
      estimatedTimeMinutes: 15,
      completed: false,
      order: subtasks.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setSubtasks(prev => [...prev, newSubtask]);
  };

  const handleUpdateSubtask = (subtaskId: string, updates: Partial<Subtask>) => {
    setSubtasks(prev => prev.map(subtask => 
      subtask.id === subtaskId 
        ? { ...subtask, ...updates, updatedAt: new Date().toISOString() }
        : subtask
    ));
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    setSubtasks(prev => prev.filter(subtask => subtask.id !== subtaskId));
  };

  if (!isOpen || !taskData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Edit3 className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Edit Task</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Task Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Name
            </label>
            <input
              type="text"
              value={taskData.name}
              onChange={(e) => setTaskData(prev => prev ? { ...prev, name: e.target.value } : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter task name"
            />
          </div>

          {/* Scheduled Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Scheduled Date
            </label>
            <input
              type="date"
              value={taskData.scheduledDate}
              onChange={(e) => setTaskData(prev => prev ? { ...prev, scheduledDate: e.target.value } : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800">Subtasks</h3>
              <button
                onClick={handleAddSubtask}
                className="flex items-center space-x-2 px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Subtask</span>
              </button>
            </div>

            <div className="space-y-3">
              {subtasks.map((subtask, index) => (
                <div key={subtask.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <span className="text-sm text-gray-500 mt-2 w-6">{index + 1}.</span>
                    
                    <div className="flex-1 space-y-3">
                      {/* Subtask Name */}
                      <input
                        type="text"
                        value={subtask.name}
                        onChange={(e) => handleUpdateSubtask(subtask.id, { name: e.target.value })}
                        placeholder="Enter subtask name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      
                      <div className="grid grid-cols-2 gap-3">
                        {/* Type */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                          <select
                            value={subtask.type}
                            onChange={(e) => handleUpdateSubtask(subtask.id, { type: e.target.value as Subtask['type'] })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="reading">Reading</option>
                            <option value="practice">Practice</option>
                            <option value="flashcard">Flashcard</option>
                            <option value="quiz">Quiz</option>
                            <option value="review">Review</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        
                        {/* Estimated Time */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Time (min)</label>
                          <input
                            type="number"
                            value={subtask.estimatedTimeMinutes}
                            onChange={(e) => handleUpdateSubtask(subtask.id, { estimatedTimeMinutes: parseInt(e.target.value) || 0 })}
                            min="5"
                            max="120"
                            step="5"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteSubtask(subtask.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete subtask"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {subtasks.length === 0 && (
                <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600 mb-3">No subtasks yet</p>
                  <button
                    onClick={handleAddSubtask}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add First Subtask</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSubmitting || !taskData.name}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskEditorModal; 