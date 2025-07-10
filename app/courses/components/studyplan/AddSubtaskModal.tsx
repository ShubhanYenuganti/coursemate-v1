import React, { useState } from 'react';

interface AddSubtaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalId: string;
  taskId: string;
  onSubtaskAdded: (subtask: any) => void;
}

const AddSubtaskModal: React.FC<AddSubtaskModalProps> = ({ isOpen, onClose, goalId, taskId, onSubtaskAdded }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('other');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const api = process.env.BACKEND_URL || 'http://localhost:5173';
      const response = await fetch(`${api}/api/goals/tasks/${taskId}/subtasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subtask_descr: name,
          subtask_type: type
        })
      });
      if (!response.ok) throw new Error('Failed to add subtask');
      const data = await response.json();
      onSubtaskAdded(data);
      onClose();
    } catch (err) {
      alert('Failed to add subtask');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">×</button>
        <h2 className="text-xl font-semibold mb-4">Add Subtask</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Subtask Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select value={type} onChange={e => setType(e.target.value)} className="w-full border rounded px-3 py-2">
              <option value="reading">Reading</option>
              <option value="flashcard">Flashcard</option>
              <option value="quiz">Quiz</option>
              <option value="practice">Practice</option>
              <option value="review">Review</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading ? 'Saving...' : 'Add Subtask'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSubtaskModal; 