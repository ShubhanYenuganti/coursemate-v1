"use client";
import React, { useState } from 'react';
import { ArrowLeft, Plus, Save, Clock, Calendar, X } from 'lucide-react';
import { GoalWithProgress, Task, Subtask } from './types';
import { toast } from 'react-hot-toast';

interface TaskScaffoldingScreenProps {
  goal: GoalWithProgress;
  onBack: () => void;
  onSave: (tasks: Task[], subtasks: Subtask[]) => void;
}

// Helper to get local date string in YYYY-MM-DD format
function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const TaskScaffoldingScreen: React.FC<TaskScaffoldingScreenProps> = ({ goal, onBack, onSave }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [currentStep, setCurrentStep] = useState<'tasks' | 'subtasks'>('tasks');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate initial task schedule based on goal
  const generateTaskSchedule = () => {
    const targetDate = new Date(goal.targetDate);
    const today = new Date();
    const daysUntilTarget = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    const taskCount = Math.max(3, Math.ceil(daysUntilTarget / 3)); // At least 3 tasks, spread out
    const newTasks: Task[] = [];
    
    for (let i = 0; i < taskCount; i++) {
      const taskDate = new Date(today);
      taskDate.setDate(today.getDate() + Math.floor((i + 1) * daysUntilTarget / taskCount));
      
      newTasks.push({
        id: `temp-task-${i}`,
        goalId: goal.id,
        name: '',
        scheduledDate: getLocalDateString(taskDate),
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    setTasks(newTasks);
  };

  const handleTaskNameChange = (taskId: string, name: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, name } : task
    ));
  };

  const handleTaskDateChange = (taskId: string, date: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, scheduledDate: date } : task
    ));
  };

  const addTask = () => {
    const newTask: Task = {
      id: `temp-task-${Date.now()}`,
      goalId: goal.id,
      name: '',
      scheduledDate: getLocalDateString(new Date()),
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setTasks(prev => [...prev, newTask]);
  };

  const removeTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
    setSubtasks(prev => prev.filter(subtask => !subtask.taskId.startsWith(taskId)));
  };

  const generateSubtasks = () => {
    const newSubtasks: Subtask[] = [];
    
    tasks.forEach(task => {
      if (task.name.trim()) {
        // Generate 3 subtasks per task
        const subtaskTypes: Array<'reading' | 'flashcard' | 'quiz' | 'practice' | 'review' | 'other'> = [
          'reading', 'practice', 'review'
        ];
        
        subtaskTypes.forEach((type, index) => {
          newSubtasks.push({
            id: `temp-subtask-${task.id}-${index}`,
            taskId: task.id,
            name: '',
            type,
            estimatedTimeMinutes: Math.ceil(goal.workMinutesPerDay / 3),
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        });
      }
    });
    
    setSubtasks(newSubtasks);
    setCurrentStep('subtasks');
  };

  const handleSubtaskChange = (subtaskId: string, field: string, value: any) => {
    setSubtasks(prev => prev.map(subtask => 
      subtask.id === subtaskId ? { ...subtask, [field]: value } : subtask
    ));
  };

  const addSubtask = (taskId: string) => {
    const newSubtask: Subtask = {
      id: `temp-subtask-${taskId}-${Date.now()}`,
      taskId,
      name: '',
      type: 'other',
      estimatedTimeMinutes: 15,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setSubtasks(prev => [...prev, newSubtask]);
  };

  const removeSubtask = (subtaskId: string) => {
    setSubtasks(prev => prev.filter(subtask => subtask.id !== subtaskId));
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      
      const validTasks = tasks.filter(task => task.name.trim());
      const validSubtasks = subtasks.filter(subtask => subtask.name.trim());
      
      console.log('Saving tasks:', validTasks);
      console.log('Saving subtasks:', validSubtasks);
      console.log('Goal ID:', goal.id);
      
      // Generate real IDs for local state
      const finalTasks = validTasks.map((task, index) => ({
        ...task,
        id: `task-${Date.now()}-${index}`
      }));
      
      // Create a mapping from old task IDs to new task IDs
      const taskIdMapping = new Map();
      validTasks.forEach((oldTask, index) => {
        taskIdMapping.set(oldTask.id, finalTasks[index].id);
      });
      
      console.log('Task ID mapping:', Object.fromEntries(taskIdMapping));
      console.log('Valid subtasks before mapping:', validSubtasks);
      
      const finalSubtasks = validSubtasks.map((subtask, index) => {
        const newTaskId = taskIdMapping.get(subtask.taskId);
        // Find the order of this subtask among its siblings
        const siblings = validSubtasks.filter(s => s.taskId === subtask.taskId);
        const subtaskOrder = siblings.findIndex(s => s.id === subtask.id);
        return {
          ...subtask,
          id: `subtask-${Date.now()}-${index}`,
          taskId: newTaskId || subtask.taskId,
          subtask_order: subtaskOrder
        };
      });
      
      console.log('Final subtasks after mapping:', finalSubtasks);
      
      onSave(finalTasks, finalSubtasks);
    } catch (error) {
      console.error('Error saving tasks:', error);
      toast.error('Failed to save study plan. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceedToSubtasks = tasks.some(task => task.name.trim());
  const canSave = currentStep === 'subtasks' && subtasks.some(subtask => subtask.name.trim());

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Set Up Your Study Plan</h1>
          <p className="text-gray-600">Create tasks and subtasks for: {goal.title}</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8">
        <div className={`flex items-center gap-2 ${currentStep === 'tasks' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep === 'tasks' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            1
          </div>
          <span className="font-medium">Define Tasks</span>
        </div>
        <div className="flex-1 h-px bg-gray-300" />
        <div className={`flex items-center gap-2 ${currentStep === 'subtasks' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep === 'subtasks' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            2
          </div>
          <span className="font-medium">Add Subtasks</span>
        </div>
      </div>

      {currentStep === 'tasks' ? (
        /* Task Creation Step */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Step 1: Define Your Tasks</h2>
            <button
              onClick={generateTaskSchedule}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Auto-generate Schedule
            </button>
          </div>

          <div className="space-y-4">
            {tasks.map((task, index) => (
              <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={task.name}
                      onChange={(e) => handleTaskNameChange(task.id, e.target.value)}
                      placeholder={`Task ${index + 1} (e.g., Review Chapter ${index + 1})`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={task.scheduledDate}
                      onChange={(e) => handleTaskDateChange(task.id, e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={() => removeTask(task.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={addTask}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Task
            </button>
            <div className="flex-1" />
            <button
              onClick={generateSubtasks}
              disabled={!canProceedToSubtasks}
              className={`px-6 py-2 rounded-lg transition-colors ${
                canProceedToSubtasks
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              Next: Add Subtasks
            </button>
          </div>
        </div>
      ) : (
        /* Subtask Creation Step */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Step 2: Add Subtasks</h2>
            <button
              onClick={() => setCurrentStep('tasks')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Back to Tasks
            </button>
          </div>

          <div className="space-y-6">
            {tasks.filter(task => task.name.trim()).map((task) => {
              const taskSubtasks = subtasks.filter(subtask => subtask.taskId === task.id);
              return (
                <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="font-medium text-gray-900">{task.name}</h3>
                    <span className="text-sm text-gray-500">
                      {new Date(task.scheduledDate + 'T00:00:00').toLocaleDateString()}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {taskSubtasks.map((subtask, index) => (
                      <div key={subtask.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={subtask.name}
                            onChange={(e) => handleSubtaskChange(subtask.id, 'name', e.target.value)}
                            placeholder={`Subtask ${index + 1} (e.g., Read pages 1-20)`}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="flex items-center gap-2">
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
                            <Clock className="w-4 h-4 text-gray-400" />
                            <input
                              type="number"
                              value={subtask.estimatedTimeMinutes}
                              onChange={(e) => handleSubtaskChange(subtask.id, 'estimatedTimeMinutes', parseInt(e.target.value))}
                              min="5"
                              className="w-16 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <span className="text-sm text-gray-500">min</span>
                          </div>
                          <button
                            onClick={() => removeSubtask(subtask.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => addSubtask(task.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors w-full justify-center"
                    >
                      <Plus className="w-4 h-4" />
                      Add Subtask
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={!canSave || isSubmitting}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
                canSave && !isSubmitting
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : 'Save Study Plan'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskScaffoldingScreen; 