"use client";
import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, Clock, BookOpen, Brain, Target, FileText, Zap, Trash2, Edit, Plus, AlertTriangle, Play, MessageCircle } from 'lucide-react';
import { Subtask } from './types';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { PomodoroProvider } from '../PomodoroContext';
import { PomodoroTimer } from '../PomodoroTimer';
import { Portal } from '../../../../components/Portal';

interface SubtaskListProps {
  taskId: string;
  subtasks: Subtask[];
  onSubtaskDeleted: (subtaskId: string) => void;
  onSubtaskAdded?: (subtask: Subtask) => void;
  onSubtaskToggled?: (subtaskId: string, completed: boolean) => void;
  taskDueDate: string;
  taskName: string;
  goalId?: string;
  courseId?: string;
}

export const SubtaskList: React.FC<SubtaskListProps> = ({
  taskId,
  subtasks,
  onSubtaskDeleted,
  onSubtaskAdded,
  onSubtaskToggled,
  taskDueDate,
  taskName,
  goalId,
  courseId
}) => {

  const [editingSubtask, setEditingSubtask] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showCompletionTimeModal, setShowCompletionTimeModal] = useState(false);
  const [completionTimeMinutes, setCompletionTimeMinutes] = useState('');
  const [subtaskToComplete, setSubtaskToComplete] = useState<Subtask | null>(null);
  const [showPomodoroModal, setShowPomodoroModal] = useState(false);
  const [timeDataModal, setTimeDataModal] = useState<{ subtask: Subtask; timeData: any } | null>(null);
  const [engagedSubtasks, setEngagedSubtasks] = useState<Set<string>>(new Set());
  const router = useRouter();

  // Start Canvas-style time tracking when subtask is clicked
  const startEngagement = async (subtaskId: string) => {
    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      const response = await fetch(`${api}/api/goals/tasks/subtasks/${subtaskId}/start-engagement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.ok) {
        setEngagedSubtasks(prev => new Set(prev).add(subtaskId));
        toast.success('Time tracking started');
      } else {
        console.error('Failed to start engagement tracking');
      }
    } catch (error) {
      console.error('Error starting engagement tracking:', error);
    }
  };

  // Update interaction time
  const updateInteraction = async (subtaskId: string) => {
    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      const response = await fetch(`${api}/api/goals/tasks/subtasks/${subtaskId}/update-interaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        console.error('Failed to update interaction time');
      }
    } catch (error) {
      console.error('Error updating interaction time:', error);
    }
  };

  // End engagement and calculate total time
  const endEngagement = async (subtaskId: string) => {
    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      const response = await fetch(`${api}/api/goals/tasks/subtasks/${subtaskId}/end-engagement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.ok) {
        setEngagedSubtasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(subtaskId);
          return newSet;
        });
        toast.success('Time tracking ended');
      } else {
        console.error('Failed to end engagement tracking');
      }
    } catch (error) {
      console.error('Error ending engagement tracking:', error);
    }
  };

  const handleSubtaskClick = async (subtask: Subtask) => {
    // If not already engaged, start engagement tracking
    if (!engagedSubtasks.has(subtask.id)) {
      await startEngagement(subtask.id);
    } else {
      // Update interaction time if already engaged
      await updateInteraction(subtask.id);
    }
    
    // Show Pomodoro timer modal
    setShowPomodoroModal(true);
  };

  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      // If we're completing a subtask, check if it has engagement data
      if (completed) {
        const subtask = subtasks.find(s => s.id === subtaskId);
        if (subtask) {
          // Check if this subtask has been engaged with (has engagement tracking)
          const hasEngagement = engagedSubtasks.has(subtaskId);
          
          if (!hasEngagement) {
            // No engagement tracking, show completion time modal
            setSubtaskToComplete(subtask);
            setShowCompletionTimeModal(true);
            return;
          }
        }
      }

      const response = await fetch(`${api}/api/goals/tasks/subtasks/${subtaskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          completed: completed
        }),
      });

      if (response.ok) {
        if (onSubtaskToggled) {
          onSubtaskToggled(subtaskId, completed);
        }
        
        // If completing a subtask, end engagement tracking
        if (completed && engagedSubtasks.has(subtaskId)) {
          await endEngagement(subtaskId);
        }
        
        toast.success(completed ? 'Subtask completed!' : 'Subtask marked as incomplete');
      } else {
        toast.error('Failed to update subtask');
      }
    } catch (error) {
      console.error('Error updating subtask:', error);
      toast.error('Failed to update subtask');
    }
  };



  const handleEditSubtask = async (subtaskId: string) => {
    if (!editName.trim()) return;

    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      const response = await fetch(`${api}/api/goals/tasks/subtasks/${subtaskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName.trim()
        }),
      });

      if (response.ok) {
        // Update the subtask in the list
        const updatedSubtasks = subtasks.map(subtask =>
          subtask.id === subtaskId ? { ...subtask, name: editName.trim() } : subtask
        );
        // You might want to add a callback to update the parent component
        setEditingSubtask(null);
        setEditName('');
        toast.success('Subtask updated successfully!');
      } else {
        toast.error('Failed to update subtask');
      }
    } catch (error) {
      console.error('Error updating subtask:', error);
      toast.error('Failed to update subtask');
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      const response = await fetch(`${api}/api/goals/tasks/subtasks/${subtaskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.ok) {
        onSubtaskDeleted(subtaskId);
        toast.success('Subtask deleted successfully!');
      } else {
        toast.error('Failed to delete subtask');
      }
    } catch (error) {
      console.error('Error deleting subtask:', error);
      toast.error('Failed to delete subtask');
    }
  };

  const getTimeData = async (subtaskId: string) => {
    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return null;
      }

      const response = await fetch(`${api}/api/goals/tasks/subtasks/${subtaskId}/time-data`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.ok) {
        const timeData = await response.json();
        return timeData;
      } else {
        console.error('Failed to get time data');
        return null;
      }
    } catch (error) {
      console.error('Error getting time data:', error);
      return null;
    }
  };

  const formatTimeData = (timeData: any) => {
    const start = timeData.started ? new Date(timeData.started) : null;
    const lastInteraction = timeData.last_changed ? new Date(timeData.last_changed) : null;
    
    return {
      started: start ? start.toLocaleString() : 'Not started',
      lastChanged: lastInteraction ? lastInteraction.toLocaleString() : 'No interactions',
      totalTime: timeData.total_time_minutes ? `${timeData.total_time_minutes.toFixed(1)} minutes` : '0 minutes'
    };
  };

  const handleSetCompletionTime = async () => {
    if (!subtaskToComplete || !completionTimeMinutes.trim()) {
      toast.error('Please enter a valid completion time');
      return;
    }

    const timeMinutes = parseFloat(completionTimeMinutes);
    if (isNaN(timeMinutes) || timeMinutes <= 0) {
      toast.error('Please enter a valid time in minutes');
      return;
    }

    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      // First, set the completion time
      const timeResponse = await fetch(`${api}/api/goals/tasks/subtasks/${subtaskToComplete.id}/set-completion-time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          completion_time_minutes: timeMinutes
        }),
      });

      if (!timeResponse.ok) {
        throw new Error('Failed to set completion time');
      }

      // Then, mark the subtask as completed
      const completionResponse = await fetch(`${api}/api/goals/tasks/subtasks/${subtaskToComplete.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          completed: true
        }),
      });

      if (completionResponse.ok) {
        if (onSubtaskToggled) {
          onSubtaskToggled(subtaskToComplete.id, true);
        }
        
        toast.success(`Subtask completed! Time recorded: ${timeMinutes} minutes`);
        
        // Reset modal state
        setShowCompletionTimeModal(false);
        setCompletionTimeMinutes('');
        setSubtaskToComplete(null);
      } else {
        throw new Error('Failed to complete subtask');
      }
    } catch (error) {
      console.error('Error setting completion time:', error);
      toast.error('Failed to set completion time');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Subtasks</h3>
        <button
          onClick={() => {
            // Convert ISO date to YYYY-MM-DD format for URL parameter
            const dueDateForUrl = taskDueDate ? new Date(taskDueDate).toISOString().split('T')[0] : '';
            
            const params = new URLSearchParams({
              addSubtaskForTask: taskId,
              taskDueDate: dueDateForUrl,
              taskName: encodeURIComponent(taskName || ''),
              goalId: goalId || '',
              courseId: courseId || '',
            });
            router.push(`/calendar?${params.toString()}`);
          }}
          className="flex items-center gap-1 text-sm bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 transition-colors"
        >
          <Plus size={14} />
          Add Subtask
        </button>
      </div>

      {subtasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p>No subtasks yet. Add your first subtask to get started!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {subtasks.map((subtask) => (
            <div
              key={subtask.id}
              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
            >
              <button
                onClick={() => handleToggleSubtask(subtask.id, !subtask.completed)}
                className="flex-shrink-0"
              >
                {subtask.completed ? (
                  <CheckCircle size={20} className="text-green-500" />
                ) : (
                  <Circle size={20} className="text-gray-400 hover:text-gray-600" />
                )}
              </button>

              <div className="flex-1">
                <p
                  className={`text-sm underline cursor-pointer ${subtask.completed ? 'text-gray-500 line-through' : 'text-gray-800'}`}
                  onClick={() => handleSubtaskClick(subtask)}
                >
                  {subtask.name}
                </p>
                {subtask.start_time || subtask.end_time ? (
                  <div className="text-xs text-gray-600 mt-1 flex items-center gap-2">
                    {subtask.start_time && (
                      <span>
                        Date: {new Date(subtask.start_time).toLocaleDateString()}<br />
                        Start: {new Date(subtask.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {subtask.end_time && (
                      <span>
                        End: {new Date(subtask.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-1">
                {/* Feedback button for time data - only show when subtask is completed */}
                {subtask.completed && (
                  <button
                    onClick={async () => {
                      const timeData = await getTimeData(subtask.id);
                      setTimeDataModal({ subtask, timeData });
                    }}
                    className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                    title="View time data"
                  >
                    <MessageCircle size={16} />
                  </button>
                )}
                
                <button
                  onClick={() => {
                    setEditingSubtask(subtask.id);
                    setEditName(subtask.name);
                  }}
                  className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                >
                  <Edit size={16} />
                </button>
                
                <button
                  onClick={() => handleDeleteSubtask(subtask.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}



      {/* Edit Subtask Modal */}
      {editingSubtask && (
        <Portal>
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999]" onClick={() => setEditingSubtask(null)}>
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full relative" onClick={e => e.stopPropagation()}>
              <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setEditingSubtask(null)}>
                <span className="text-xl">&times;</span>
              </button>
              <h3 className="text-lg font-semibold mb-4">Edit Subtask</h3>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter subtask name..."
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleEditSubtask(editingSubtask)}
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleEditSubtask(editingSubtask)}
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
                >
                  Update Subtask
                </button>
                <button
                  onClick={() => setEditingSubtask(null)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Pomodoro Timer Modal */}
      {showPomodoroModal && (
        <Portal>
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999]" onClick={() => setShowPomodoroModal(false)}>
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full relative" onClick={e => e.stopPropagation()}>
              <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowPomodoroModal(false)}>
                <span className="text-xl">&times;</span>
              </button>
              <PomodoroProvider>
                <PomodoroTimer />
              </PomodoroProvider>
            </div>
          </div>
        </Portal>
      )}

      {/* Time Data Modal */}
      {timeDataModal && (
        <Portal>
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999]" onClick={() => setTimeDataModal(null)}>
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full relative" onClick={e => e.stopPropagation()}>
              <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setTimeDataModal(null)}>
                <span className="text-xl">&times;</span>
              </button>
              <h3 className="text-lg font-semibold mb-4 text-center">Time Data</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Started:</span>
                  <span>{formatTimeData(timeDataModal.timeData).started}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Last Changed:</span>
                  <span>{formatTimeData(timeDataModal.timeData).lastChanged}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Total Time:</span>
                  <span>{formatTimeData(timeDataModal.timeData).totalTime}</span>
                </div>
              </div>
              <div className="mt-6 text-center">
                <button
                  onClick={() => setTimeDataModal(null)}
                  className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Completion Time Modal */}
      {showCompletionTimeModal && subtaskToComplete && (
        <Portal>
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999]" onClick={() => setShowCompletionTimeModal(false)}>
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full relative" onClick={e => e.stopPropagation()}>
              <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowCompletionTimeModal(false)}>
                <span className="text-xl">&times;</span>
              </button>
              <h3 className="text-lg font-semibold mb-4 text-center">Record Completion Time</h3>
              <p className="text-sm text-gray-600 mb-4 text-center">
                How long did it take you to complete "{subtaskToComplete.name}"?
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time (minutes)</label>
                  <input
                    type="number"
                    value={completionTimeMinutes}
                    onChange={(e) => setCompletionTimeMinutes(e.target.value)}
                    placeholder="e.g., 15.5"
                    min="0.1"
                    step="0.1"
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleSetCompletionTime()}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCompletionTimeModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSetCompletionTime}
                    className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
                  >
                    Complete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}; 