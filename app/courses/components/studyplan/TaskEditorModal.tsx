"use client";
import React, { useState } from 'react';
import { X, Plus, Save, Clock } from 'lucide-react';
import { TaskWithProgress, Subtask } from './types';

interface TaskEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskWithProgress;
  onSave: (updatedTask: TaskWithProgress) => void;
}

const TaskEditorModal: React.FC<TaskEditorModalProps> = ({ isOpen, onClose, task, onSave }) => {
  const [editedTask, setEditedTask] = useState<TaskWithProgress>(task);
  const [editedSubtasks, setEditedSubtasks] = useState<Subtask[]>(task.subtasks);

  const handleTaskChange = (field: string, value: any) => {
    setEditedTask(prev => ({ ...prev, [field]: value }));
  };

  const handleSubtaskChange = (subtaskId: string, field: string, value: any) => {
    setEditedSubtasks(prev => prev.map(subtask => 
      subtask.id === subtaskId ? { ...subtask, [field]: value } : subtask
    ));
  };

  const addSubtask = () => {
    const newSubtask: Subtask = {
      id: `temp-subtask-${Date.now()}`,
      taskId: task.id,
      name: '',
      type: 'other',
      estimatedTimeMinutes: 15,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setEditedSubtasks(prev => [...prev, newSubtask]);
  };

  const removeSubtask = (subtaskId: string) => {
    setEditedSubtasks(prev => prev.filter(subtask => subtask.id !== subtaskId));
  };

  const handleSave = () => {
    const updatedTask: TaskWithProgress = {
      ...editedTask,
      subtasks: editedSubtasks,
      totalSubtasks: editedSubtasks.length,
      completedSubtasks: editedSubtasks.filter(s => s.completed).length,
      progress: editedSubtasks.length > 0 
        ? Math.round((editedSubtasks.filter(s => s.completed).length / editedSubtasks.length) * 100)
        : 0
    };
    onSave(updatedTask);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Edit Task</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Task Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Name
                </label>
                <input
                  type="text"
                  value={editedTask.name}
                  onChange={(e) => handleTaskChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled Date
                </label>
                <input
                  type="date"
                  value={editedTask.scheduledDate}
                  onChange={(e) => handleTaskChange('scheduledDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Subtasks */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Subtasks</h3>
                <button
                  onClick={addSubtask}
                  className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Subtask
                </button>
              </div>

              <div className="space-y-3">
                {editedSubtasks.map((subtask, index) => (
                  <div key={subtask.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={subtask.name}
                        onChange={(e) => handleSubtaskChange(subtask.id, 'name', e.target.value)}
                        placeholder={`Subtask ${index + 1}`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <select
                      value={subtask.type}
                      onChange={(e) => handleSubtaskChange(subtask.id, 'type', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="reading">Reading</option>
                      <option value="flashcard">Flashcard</option>
                      <option value="quiz">Quiz</option>
                      <option value="practice">Practice</option>
                      <option value="review">Review</option>
                      <option value="other">Other</option>
                    </select>
                    
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={subtask.estimatedTimeMinutes}
                        onChange={(e) => handleSubtaskChange(subtask.id, 'estimatedTimeMinutes', parseInt(e.target.value) || 0)}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="5"
                        max="120"
                      />
                      <span className="text-sm text-gray-500">min</span>
                    </div>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={subtask.completed}
                        onChange={(e) => handleSubtaskChange(subtask.id, 'completed', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Done</span>
                    </label>
                    
                    <button
                      onClick={() => removeSubtask(subtask.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {editedSubtasks.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No subtasks yet. Add your first subtask to get started.</p>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Total Time:</span>
                <span className="font-medium">
                  {editedSubtasks.reduce((sum, s) => sum + s.estimatedTimeMinutes, 0)} minutes
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-700">Completed:</span>
                <span className="font-medium">
                  {editedSubtasks.filter(s => s.completed).length} of {editedSubtasks.length}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskEditorModal; 