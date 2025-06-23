"use client";
import React, { useState } from 'react';
import { X, Target, Calendar, Clock, Repeat } from 'lucide-react';
import { Goal } from './types';
import { Portal } from '../../../../components/Portal';

interface AddGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => void;
  courseId: string;
}

const AddGoalModal: React.FC<AddGoalModalProps> = ({ isOpen, onClose, onSubmit, courseId }) => {
  const [formData, setFormData] = useState({
    title: '',
    targetDate: '',
    workMinutesPerDay: 30,
    frequency: 'daily' as 'daily' | 'weekly' | 'custom',
    customScheduleDays: [] as string[]
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const weekDays = [
    { key: 'monday', label: 'Mon' },
    { key: 'tuesday', label: 'Tue' },
    { key: 'wednesday', label: 'Wed' },
    { key: 'thursday', label: 'Thu' },
    { key: 'friday', label: 'Fri' },
    { key: 'saturday', label: 'Sat' },
    { key: 'sunday', label: 'Sun' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'> = {
        courseId,
        title: formData.title,
        targetDate: formData.targetDate,
        workMinutesPerDay: formData.workMinutesPerDay,
        frequency: formData.frequency,
        customScheduleDays: formData.frequency === 'custom' ? formData.customScheduleDays : undefined,
        completed: false
      };

      onSubmit(goalData);
      handleReset();
    } catch (error) {
      console.error('Error creating goal:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      title: '',
      targetDate: '',
      workMinutesPerDay: 30,
      frequency: 'daily',
      customScheduleDays: []
    });
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleCustomDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      customScheduleDays: prev.customScheduleDays.includes(day)
        ? prev.customScheduleDays.filter(d => d !== day)
        : [...prev.customScheduleDays, day]
    }));
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div 
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-[9999]"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        onClick={(e) => e.target === e.currentTarget && handleClose()}
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
              onClick={handleClose}
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
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Final Exam Preparation"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
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
                onChange={(e) => setFormData(prev => ({ ...prev, targetDate: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
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
                onChange={(e) => setFormData(prev => ({ ...prev, workMinutesPerDay: parseInt(e.target.value) }))}
                min="15"
                max="480"
                step="15"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {Math.round(formData.workMinutesPerDay / 60 * 10) / 10} hours per day
              </p>
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
                    onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value as 'daily' }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value as 'weekly' }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value as 'custom' }))}
                    className="mr-2"
                  />
                  <span>Custom Days</span>
                </label>
              </div>

              {/* Custom Days Selection */}
              {formData.frequency === 'custom' && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2">Select study days:</p>
                  <div className="flex flex-wrap gap-2">
                    {weekDays.map(day => (
                      <button
                        key={day.key}
                        type="button"
                        onClick={() => handleCustomDayToggle(day.key)}
                        className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                          formData.customScheduleDays.includes(day.key)
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.title || !formData.targetDate}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Creating...' : 'Create Goal'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
};

export default AddGoalModal; 