"use client";
import React, { useState, useMemo } from 'react';
import { X, Target, Calendar, Clock, Repeat } from 'lucide-react';
import { Goal, GoalWithProgress } from './types';
import { Portal } from '../../../../components/Portal';

interface AddGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  onGoalAdded: (goal: GoalWithProgress) => void;
}

const AddGoalModal: React.FC<AddGoalModalProps> = ({ isOpen, onClose, courseId, onGoalAdded }) => {
  const [formData, setFormData] = useState({
    title: '',
    targetDate: '',
    workMinutesPerDay: 60,
    frequency: 'daily' as 'daily' | 'weekly' | 'custom',
    customScheduleDays: [] as number[]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Goal title is required';
    }

    if (!formData.targetDate) {
      newErrors.targetDate = 'Target date is required';
    } else if (new Date(formData.targetDate) <= new Date()) {
      newErrors.targetDate = 'Target date must be in the future';
    }

    if (formData.workMinutesPerDay < 15) {
      newErrors.workMinutesPerDay = 'Minimum 15 minutes per day';
    }

    if (formData.frequency === 'custom' && formData.customScheduleDays.length === 0) {
      newErrors.customScheduleDays = 'Select at least one day';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Memoize form validation to prevent infinite re-renders
  const isFormValid = useMemo(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Goal title is required';
    }

    if (!formData.targetDate) {
      newErrors.targetDate = 'Target date is required';
    } else if (new Date(formData.targetDate) <= new Date()) {
      newErrors.targetDate = 'Target date must be in the future';
    }

    if (formData.workMinutesPerDay < 15) {
      newErrors.workMinutesPerDay = 'Minimum 15 minutes per day';
    }

    if (formData.frequency === 'custom' && formData.customScheduleDays.length === 0) {
      newErrors.customScheduleDays = 'Select at least one day';
    }

    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      const api = process.env.BACKEND_URL || "http://localhost:5173";
      const token = localStorage.getItem('token');
      const response = await fetch(`${api}/api/courses/${courseId}/goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          goal_descr: formData.title.trim(),
          due_date: formData.targetDate,
          work_minutes_per_day: formData.workMinutesPerDay,
          frequency: formData.frequency,
          custom_schedule_days: formData.frequency === 'custom' ? formData.customScheduleDays : undefined
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to create goal');
      }
      const data = await response.json();
      // Assume backend returns an array of goals, take the first
      const backendGoal = data[0];
      const newGoal: GoalWithProgress = {
        id: backendGoal.goal_id || backendGoal.id,
        courseId,
        title: backendGoal.goal_descr,
        targetDate: backendGoal.due_date,
        workMinutesPerDay: backendGoal.work_minutes_per_day || formData.workMinutesPerDay,
        frequency: backendGoal.frequency || formData.frequency,
        customScheduleDays: backendGoal.custom_schedule_days || formData.customScheduleDays,
        createdAt: backendGoal.created_at || new Date().toISOString(),
        updatedAt: backendGoal.updated_at || new Date().toISOString(),
        progress: backendGoal.progress || 0,
        totalTasks: backendGoal.total_tasks || 0,
        completedTasks: backendGoal.completed_tasks || 0
      };
      onGoalAdded(newGoal);
    } catch (error) {
      alert('Failed to create goal. Please try again.');
      console.error(error);
    }
  };

  const handleCustomDayToggle = (dayNumber: number) => {
    const newDays = formData.customScheduleDays.includes(dayNumber)
      ? formData.customScheduleDays.filter(d => d !== dayNumber)
      : [...formData.customScheduleDays, dayNumber];
    
    handleInputChange('customScheduleDays', newDays);
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (!isOpen) return null;

  return (
    <Portal>
      <div 
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-[9999]"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="bg-white rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto m-2 shadow-xl" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Target className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Add New Goal</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Goal Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Goal Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., Final Exam Preparation"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title}</p>
              )}
            </div>

            {/* Target Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Target Date
              </label>
              <input
                type="date"
                value={formData.targetDate}
                onChange={(e) => handleInputChange('targetDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.targetDate ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
              {errors.targetDate && (
                <p className="text-red-500 text-sm mt-1">{errors.targetDate}</p>
              )}
            </div>

            {/* Work Time Per Day */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Daily Study Time (minutes)
              </label>
              <input
                type="number"
                value={formData.workMinutesPerDay}
                onChange={(e) => handleInputChange('workMinutesPerDay', parseInt(e.target.value) || 0)}
                min="15"
                max="480"
                step="15"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.workMinutesPerDay ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {Math.round(formData.workMinutesPerDay / 60 * 10) / 10} hours per day
              </p>
              {errors.workMinutesPerDay && (
                <p className="text-red-500 text-sm mt-1">{errors.workMinutesPerDay}</p>
              )}
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Repeat className="w-4 h-4 inline mr-1" />
                Study Frequency
              </label>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="frequency"
                    value="daily"
                    checked={formData.frequency === 'daily'}
                    onChange={(e) => handleInputChange('frequency', e.target.value as 'daily')}
                    className="mr-2"
                  />
                  <span>Daily</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="frequency"
                    value="weekly"
                    checked={formData.frequency === 'weekly'}
                    onChange={(e) => handleInputChange('frequency', e.target.value as 'weekly')}
                    className="mr-2"
                  />
                  <span>Weekly</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="frequency"
                    value="custom"
                    checked={formData.frequency === 'custom'}
                    onChange={(e) => handleInputChange('frequency', e.target.value as 'custom')}
                    className="mr-2"
                  />
                  <span>Custom Days</span>
                </label>
              </div>
            </div>

            {/* Custom Days */}
            {formData.frequency === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Days
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {dayNames.map((day, index) => (
                    <label key={index} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.customScheduleDays.includes(index)}
                        onChange={() => handleCustomDayToggle(index)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">{day}</span>
                    </label>
                  ))}
                </div>
                {errors.customScheduleDays && (
                  <p className="text-red-500 text-sm mt-1">{errors.customScheduleDays}</p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isFormValid}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create Goal
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
};

export default AddGoalModal; 