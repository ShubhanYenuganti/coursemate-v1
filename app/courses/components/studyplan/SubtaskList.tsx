"use client";
import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, Clock, BookOpen, Brain, Target, FileText, Zap, Trash2, Edit, Plus, AlertTriangle } from 'lucide-react';
import { Subtask } from './types';
import { toast } from 'react-hot-toast';

interface SubtaskListProps {
  taskId: string;
  subtasks: Subtask[];
  onSubtaskDeleted: (subtaskId: string) => void;
  onSubtaskAdded?: (subtask: Subtask) => void;
  onSubtaskToggled?: (subtaskId: string, completed: boolean) => void;
  taskDueDate: string;
}

const SubtaskList: React.FC<SubtaskListProps> = ({ taskId, subtasks, onSubtaskDeleted, onSubtaskAdded, onSubtaskToggled, taskDueDate }) => {
  const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>(subtasks);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Update local subtasks when props change and maintain order
  useEffect(() => {
    // Only update if the subtasks prop has actually changed (not just a re-render)
    const hasChanged =
      subtasks.length !== localSubtasks.length ||
      subtasks.some((propSubtask, index) => {
        const currentSubtask = localSubtasks[index];
        return !currentSubtask || 
               propSubtask.id !== currentSubtask.id ||
               propSubtask.name !== currentSubtask.name ||
               propSubtask.type !== currentSubtask.type ||
               propSubtask.completed !== currentSubtask.completed ||
               propSubtask.subtask_order !== currentSubtask.subtask_order;
      });
    if (hasChanged) {
      setLocalSubtasks(subtasks);
    }
  }, [subtasks, localSubtasks]);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newSubtaskName, setNewSubtaskName] = useState('');
  const [newSubtaskType, setNewSubtaskType] = useState<'other' | 'reading' | 'flashcard' | 'quiz' | 'practice' | 'review'>('other');
  const [newSubtaskTime, setNewSubtaskTime] = useState(15);
  const [editingSubtask, setEditingSubtask] = useState<string | null>(null);
  const [editedSubtaskName, setEditedSubtaskName] = useState('');
  const [editedSubtaskType, setEditedSubtaskType] = useState<'other' | 'reading' | 'flashcard' | 'quiz' | 'practice' | 'review'>('other');
  const [editedSubtaskTime, setEditedSubtaskTime] = useState(15);

  const handleToggleSubtask = async (subtaskId: string) => {
    const subtask = localSubtasks.find(s => s.id === subtaskId);
    if (!subtask) return;

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
          subtask_descr: subtask.name,
          subtask_completed: !subtask.completed
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update subtask');
      }

      // Update local state
      const updatedSubtasks = localSubtasks.map(s => 
        s.id === subtaskId ? { ...s, completed: !s.completed } : s
      );
      setLocalSubtasks(updatedSubtasks);

      if (onSubtaskToggled) {
        onSubtaskToggled(subtaskId, !subtask.completed);
      }
    } catch (error) {
      console.error('Error toggling subtask:', error);
      toast.error('Failed to update subtask');
    }
  };

  const handleDeleteClick = (subtaskId: string) => {
    setDeleteConfirmId(subtaskId);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const handleDeleteConfirm = async (subtaskId: string) => {
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
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete subtask');
      }

      // Update local state
      setLocalSubtasks(prevSubtasks => prevSubtasks.filter(s => s.id !== subtaskId));
      
      // Notify parent component
      onSubtaskDeleted(subtaskId);
      
      toast.success('Subtask deleted');
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting subtask:', error);
      toast.error('Failed to delete subtask');
    }
  };

  const handleEditClick = (subtask: Subtask) => {
    setEditingSubtask(subtask.id);
    setEditedSubtaskName(subtask.name);
    setEditedSubtaskType(subtask.type);
    setEditedSubtaskTime(subtask.estimatedTimeMinutes);
  };

  const handleSaveEdit = async (subtaskId: string) => {
    if (!editedSubtaskName.trim()) {
      return;
    }

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
          subtask_descr: editedSubtaskName,
          subtask_type: editedSubtaskType,
          subtask_order: localSubtasks.find(s => s.id === subtaskId)?.subtask_order ?? 0,
          subtask_completed: localSubtasks.find(s => s.id === subtaskId)?.completed || false
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update subtask');
      }

      // Update local state
      const updatedSubtasks = localSubtasks.map(s => 
        s.id === subtaskId ? { 
          ...s, 
          name: editedSubtaskName,
          type: editedSubtaskType,
          estimatedTimeMinutes: editedSubtaskTime
        } : s
      );
      setLocalSubtasks(updatedSubtasks);
      
      // Reset edit state
      setEditingSubtask(null);
      setEditedSubtaskName('');
      setEditedSubtaskType('other');
      setEditedSubtaskTime(15);
      
      toast.success('Subtask updated');
    } catch (error) {
      console.error('Error updating subtask:', error);
      toast.error('Failed to update subtask');
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskName.trim()) {
      return;
    }

    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      const response = await fetch(`${api}/api/goals/tasks/${taskId}/subtasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subtask_descr: newSubtaskName,
          subtask_type: newSubtaskType,
          subtask_completed: false,
          subtask_order: localSubtasks.length > 0 ? Math.max(...localSubtasks.map(s => s.subtask_order ?? 0)) + 1 : 0,
          task_due_date: taskDueDate
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add subtask');
      }

      const data = await response.json();
      
      // Get the actual subtask_order from the backend response
      const actualSubtaskOrder = data.subtask.subtask_order !== undefined ? data.subtask.subtask_order : 
        (localSubtasks.length > 0 ? Math.max(...localSubtasks.map(s => s.subtask_order ?? 0)) + 1 : 0);
      
      // Add new subtask to local state
      const newSubtask: Subtask = {
        id: data.subtask_id,
        taskId: taskId,
        name: newSubtaskName,
        type: newSubtaskType,
        estimatedTimeMinutes: newSubtaskTime, // This might not be stored in backend but we keep it in frontend
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        task_due_date: taskDueDate,
        subtask_order: actualSubtaskOrder
      };
      
      setLocalSubtasks(updatedSubtasks => [...updatedSubtasks, newSubtask]);
      
      // Reset form
      setNewSubtaskName('');
      setNewSubtaskType('other');
      setNewSubtaskTime(15);
      setIsAddingSubtask(false);
      
      toast.success('Subtask added');

      if (onSubtaskAdded) {
        onSubtaskAdded(newSubtask);
      }
    } catch (error) {
      console.error('Error adding subtask:', error);
      toast.error('Failed to add subtask');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'reading':
        return <BookOpen className="w-4 h-4" />;
      case 'flashcard':
        return <Brain className="w-4 h-4" />;
      case 'quiz':
        return <Target className="w-4 h-4" />;
      case 'practice':
        return <Zap className="w-4 h-4" />;
      case 'review':
        return <FileText className="w-4 h-4" />;
      default:
        return <Circle className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'reading':
        return 'text-blue-600';
      case 'flashcard':
        return 'text-purple-600';
      case 'quiz':
        return 'text-green-600';
      case 'practice':
        return 'text-orange-600';
      case 'review':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  if (localSubtasks.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p>No subtasks created yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-gray-700 mb-2">Subtasks</h4>
      
      {localSubtasks.length === 0 ? (
        <p className="text-sm text-gray-500">No subtasks yet.</p>
      ) : (
    <div className="space-y-2">
      {localSubtasks.map(subtask => (
            <div key={subtask.id} className="flex items-start gap-2 py-2 border-b border-gray-100">
              {editingSubtask === subtask.id ? (
                <div className="flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subtask Name *
                      </label>
                      <input
                        type="text"
                        value={editedSubtaskName}
                        onChange={(e) => setEditedSubtaskName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        autoFocus
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        value={editedSubtaskType}
                        onChange={(e) => setEditedSubtaskType(e.target.value as 'other' | 'reading' | 'flashcard' | 'quiz' | 'practice' | 'review')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="reading">Reading</option>
                        <option value="flashcard">Flashcard</option>
                        <option value="quiz">Quiz</option>
                        <option value="practice">Practice</option>
                        <option value="review">Review</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Time (min)
                      </label>
                      <input
                        type="number"
                        value={editedSubtaskTime}
                        onChange={(e) => setEditedSubtaskTime(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="5"
                        max="120"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      onClick={() => {
                        setEditingSubtask(null);
                        setEditedSubtaskName('');
                        setEditedSubtaskType('other');
                        setEditedSubtaskTime(15);
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(subtask.id)}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Edit Subtask
                    </button>
                  </div>
                </div>
              ) : (
                <>
          <button
            onClick={() => handleToggleSubtask(subtask.id)}
                    className="flex-shrink-0 mt-0.5"
          >
            {subtask.completed ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
                      <Circle className="w-4 h-4 text-gray-300" />
            )}
          </button>
                  <div className="flex-1">
                    <p className={`text-sm ${subtask.completed ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                      {subtask.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditClick(subtask)}
                      className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(subtask.id)}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Add Subtask Form */}
      {isAddingSubtask ? (
        <div className="mt-3 bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subtask Name *
              </label>
              <input
                type="text"
                value={newSubtaskName}
                onChange={(e) => setNewSubtaskName(e.target.value)}
                placeholder="Enter subtask name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={newSubtaskType}
                onChange={(e) => setNewSubtaskType(e.target.value as 'other' | 'reading' | 'flashcard' | 'quiz' | 'practice' | 'review')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="reading">Reading</option>
                <option value="flashcard">Flashcard</option>
                <option value="quiz">Quiz</option>
                <option value="practice">Practice</option>
                <option value="review">Review</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time (min)
              </label>
              <input
                type="number"
                value={newSubtaskTime}
                onChange={(e) => setNewSubtaskTime(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="5"
                max="120"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => {
                setIsAddingSubtask(false);
                setNewSubtaskName('');
                setNewSubtaskType('other');
                setNewSubtaskTime(15);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddSubtask}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Subtask
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAddingSubtask(true)}
          className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
        >
          <Plus className="w-3 h-3" />
          <span>Add Subtask</span>
        </button>
      )}
      
      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg max-w-sm w-full border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h4 className="text-base font-medium">Delete Subtask</h4>
            </div>
            <p className="text-sm text-gray-700 mb-4">
              Are you sure you want to delete this subtask? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button 
                onClick={handleCancelDelete}
                className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={() => deleteConfirmId && handleDeleteConfirm(deleteConfirmId)}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubtaskList; 