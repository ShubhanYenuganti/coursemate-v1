import React, { useState } from 'react';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalId: string;
  onTaskAdded: (task: any) => void;
  onAIGenerate: () => void;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, goalId, onTaskAdded, onAIGenerate }) => {
  const [step, setStep] = useState<'task' | 'subtasks'>('task');
  const [taskData, setTaskData] = useState({
    name: '',
    scheduledDate: '',
    estimatedTime: 60
  });
  const [createdTask, setCreatedTask] = useState<any>(null);
  const [subtasks, setSubtasks] = useState<Array<{ name: string; type: string }>>([]);
  const [currentSubtask, setCurrentSubtask] = useState({ name: '', type: 'other' });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const api = process.env.BACKEND_URL || 'http://localhost:5173';
      
      console.log('🔍 Add Task Debug:', {
        api,
        token: token ? 'Present' : 'Missing',
        goalId,
        taskData
      });
      
      // Use the save-tasks endpoint with a single task
      const response = await fetch(`${api}/api/goals/${goalId}/save-tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tasks: [{
            task_title: taskData.name,
            task_descr: '',
            task_completed: false,
            task_type: 'Study',
            due_date: taskData.scheduledDate,
            subtasks: [] // Empty subtasks array, will be added in next step
          }]
        })
      });
      
      console.log('🔍 Response status:', response.status);
      
      if (!response.ok) {
        let errorData;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          errorData = { error: await response.text() };
        }
        console.error('🔍 Error response:', errorData);
        throw new Error(errorData.error || 'Failed to add task');
      }
      
      const data = await response.json();
      console.log('🔍 Success response:', data);
      
      // The response should contain the created task data
      // We need to extract the task_id from the response
      const createdTaskData = data[0]; // First task in the response
      setCreatedTask({
        task_id: createdTaskData.task_id,
        task_title: createdTaskData.task_title,
        due_date: createdTaskData.due_date
      });
      setStep('subtasks');
    } catch (err) {
      console.error('🔍 Error adding task:', err);
      alert('Failed to add task: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubtask = () => {
    if (currentSubtask.name.trim()) {
      setSubtasks([...subtasks, { ...currentSubtask }]);
      setCurrentSubtask({ name: '', type: 'other' });
    }
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const handleFinish = async () => {
    if (subtasks.length === 0) {
      // No subtasks to add, just close
      onTaskAdded(createdTask);
      handleClose();
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const api = process.env.BACKEND_URL || 'http://localhost:5173';
      
      console.log('🔍 Adding subtasks for task:', createdTask.task_id);
      console.log('🔍 Subtasks to add:', subtasks);
      
      // Add all subtasks
      for (const subtask of subtasks) {
        const response = await fetch(`${api}/api/goals/tasks/${createdTask.task_id}/subtasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            subtask_descr: subtask.name,
            subtask_type: subtask.type
          })
        });
        
        console.log('🔍 Subtask response status:', response.status);
        
        if (!response.ok) {
          let errorData;
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
          } else {
            errorData = { error: await response.text() };
          }
          console.error('🔍 Subtask error response:', errorData);
          throw new Error(errorData.error || 'Failed to add subtask');
        }
        
        const subtaskData = await response.json();
        console.log('🔍 Subtask created:', subtaskData);
      }
      
      onTaskAdded(createdTask);
      handleClose();
    } catch (err) {
      console.error('🔍 Error adding subtasks:', err);
      alert('Failed to add subtasks: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('task');
    setTaskData({ name: '', scheduledDate: '', estimatedTime: 60 });
    setCreatedTask(null);
    setSubtasks([]);
    setCurrentSubtask({ name: '', type: 'other' });
    onClose();
  };

  const handleBack = () => {
    setStep('task');
    setCreatedTask(null);
    setSubtasks([]);
    setCurrentSubtask({ name: '', type: 'other' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
        <button onClick={handleClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">×</button>
        
        {step === 'task' ? (
          <>
            <h2 className="text-xl font-semibold mb-4">Add Task</h2>
            <form onSubmit={handleTaskSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Task Name</label>
                <input 
                  type="text" 
                  value={taskData.name} 
                  onChange={e => setTaskData({...taskData, name: e.target.value})} 
                  required 
                  className="w-full border rounded px-3 py-2" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Scheduled Date</label>
                <input 
                  type="date" 
                  value={taskData.scheduledDate} 
                  onChange={e => setTaskData({...taskData, scheduledDate: e.target.value})} 
                  required 
                  className="w-full border rounded px-3 py-2" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Estimated Time (minutes)</label>
                <input 
                  type="number" 
                  value={taskData.estimatedTime} 
                  min={1} 
                  onChange={e => setTaskData({...taskData, estimatedTime: Number(e.target.value)})} 
                  required 
                  className="w-full border rounded px-3 py-2" 
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={handleClose} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                <button type="button" className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700" onClick={onAIGenerate}>
                  AI Generate
                </button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">
                  {loading ? 'Saving...' : 'Next: Add Subtasks'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold mb-4">Add Subtasks</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">Task: <span className="font-medium">{taskData.name}</span></p>
              
              {/* Add new subtask */}
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Subtask Name</label>
                  <input 
                    type="text" 
                    value={currentSubtask.name} 
                    onChange={e => setCurrentSubtask({...currentSubtask, name: e.target.value})} 
                    className="w-full border rounded px-3 py-2" 
                    placeholder="Enter subtask name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select 
                    value={currentSubtask.type} 
                    onChange={e => setCurrentSubtask({...currentSubtask, type: e.target.value})} 
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="reading">Reading</option>
                    <option value="flashcard">Flashcard</option>
                    <option value="quiz">Quiz</option>
                    <option value="practice">Practice</option>
                    <option value="review">Review</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <button 
                  type="button" 
                  onClick={handleAddSubtask}
                  disabled={!currentSubtask.name.trim()}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300"
                >
                  Add Subtask
                </button>
              </div>

              {/* List of added subtasks */}
              {subtasks.length > 0 && (
                <div className="border rounded p-3 bg-gray-50">
                  <h3 className="font-medium text-sm mb-2">Added Subtasks:</h3>
                  <div className="space-y-2">
                    {subtasks.map((subtask, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                        <div>
                          <span className="font-medium text-sm">{subtask.name}</span>
                          <span className="text-xs text-gray-500 ml-2">({subtask.type})</span>
                        </div>
                        <button 
                          onClick={() => handleRemoveSubtask(index)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between gap-2">
              <button onClick={handleBack} className="px-4 py-2 bg-gray-200 rounded">Back</button>
              <button 
                onClick={handleFinish} 
                disabled={loading} 
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                {loading ? 'Saving...' : subtasks.length === 0 ? 'Skip Subtasks' : 'Finish'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AddTaskModal; 