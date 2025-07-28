"use client";
import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, Clock, BookOpen, Brain, Target, FileText, Zap, Trash2, Edit, Plus, AlertTriangle, Play, MessageCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Subtask } from './types';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { TimerProvider } from '../TimerContext';
import { AudioProvider } from '../AudioContext';
import { UnifiedTimer } from '../UnifiedTimer';
import { Portal } from '../../../../components/Portal';
import Select from 'react-select';
import AnnotatablePDFViewer from '../../../../components/courses/AnnotatablePDFViewer';
import QuizViewer from '../QuizViewer';
import FlashcardViewer from '../FlashcardViewer';

// Timer state store to preserve timer state across component boundaries
const timerStateStore = {
  currentState: null as any,
  setState: (state: any) => {
    timerStateStore.currentState = state;
  },
  getState: () => timerStateStore.currentState,
  clearState: () => {
    timerStateStore.currentState = null;
  }
};

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
  const [showStartModal, setShowStartModal] = useState(false);
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'select' | 'upload' | 'generate'>('select');
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [activeSubtask, setActiveSubtask] = useState<Subtask | null>(null);
  const [subtaskToStart, setSubtaskToStart] = useState<Subtask | null>(null);
  const [timeDataModal, setTimeDataModal] = useState<{ subtask: Subtask; timeData: any } | null>(null);
  
  // Materials state
  const [courseMaterials, setCourseMaterials] = useState<any[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [activeMaterial, setActiveMaterial] = useState<any>(null); // Store material for active subtask
  const [engagedSubtasks, setEngagedSubtasks] = useState<Set<string>>(new Set());
  const [pausedSubtasks, setPausedSubtasks] = useState<Set<string>>(new Set());
  const router = useRouter();

  // Fetch course materials
  const fetchCourseMaterials = async () => {
    if (!courseId) return;
    
    setLoadingMaterials(true);
    try {
      const token = localStorage.getItem('token');
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      
      // Extract just the course_id part if combo_id is provided (e.g., 'courseid+somethingelse')
      const getS3CourseId = (id: string) => id.split('+')[0];
      const s3CourseId = getS3CourseId(courseId);
      
      const response = await fetch(`${api}/api/courses/${s3CourseId}/materials/db`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch course materials');
      }

      const materials = await response.json();
      setCourseMaterials(materials);
    } catch (error) {
      console.error('Error fetching course materials:', error);
      toast.error('Failed to load course materials');
    } finally {
      setLoadingMaterials(false);
    }
  };

  // Fetch materials when component mounts or courseId changes
  useEffect(() => {
    fetchCourseMaterials();
  }, [courseId]);

  // Persist pausedSubtasks to localStorage
  useEffect(() => {
    const savedPausedSubtasks = localStorage.getItem('pausedSubtasks');
    if (savedPausedSubtasks) {
      try {
        const parsed = JSON.parse(savedPausedSubtasks);
        setPausedSubtasks(new Set(parsed));
      } catch (error) {
        console.error('Error parsing pausedSubtasks from localStorage:', error);
      }
    }
  }, []);

  // Save pausedSubtasks to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pausedSubtasks', JSON.stringify(Array.from(pausedSubtasks)));
  }, [pausedSubtasks]);

  // Check if a subtask is paused
  const isSubtaskPaused = (subtaskId: string) => {
    return pausedSubtasks.has(subtaskId);
  };

  // Check if a subtask is currently engaged
  const isSubtaskEngaged = (subtaskId: string) => {
    return engagedSubtasks.has(subtaskId);
  };

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

  // Modified subtask click handler
  const handleSubtaskClick = async (subtask: Subtask) => {
    console.log('=== SUBTASK CLICK DEBUG (SubtaskList) ===');
    console.log('Clicked subtask:', subtask.id, subtask.name);
    console.log('Paused subtasks:', Array.from(pausedSubtasks));
    console.log('Engaged subtasks:', Array.from(engagedSubtasks));
    console.log('Is paused:', isSubtaskPaused(subtask.id));
    console.log('Is engaged:', isSubtaskEngaged(subtask.id));
    
    // First check if it's paused locally
    if (isSubtaskPaused(subtask.id)) {
      console.log('SHOWING RESUME MODAL (paused locally)');
      setSubtaskToStart(subtask);
      setShowResumeModal(true);
      return;
    }
    
    // Then check engagement status from API
    console.log('Fetching time data...');
    const timeData = await getTimeData(subtask.id);
    console.log('Time data received:', timeData);
    console.log('Is currently engaged:', timeData?.is_currently_engaged);
    console.log('Total seconds:', timeData?.total_time_seconds);
    console.log('Total minutes:', timeData?.total_time_minutes);
    
    // Check if currently engaged or has time tracked
    if (timeData && (timeData.is_currently_engaged || timeData.total_time_seconds > 0 || timeData.total_time_minutes > 0)) {
      console.log('SHOWING RESUME MODAL (engaged or has time tracked)');
      setSubtaskToStart(subtask);
      setShowResumeModal(true);
      return;
    }
    
    console.log('SHOWING MATERIALS MODAL');
    setSubtaskToStart(subtask);
    setSelectedMaterial(null); // Reset selected material
    setShowMaterialsModal(true);
  };

  // Start engagement and show active subtask screen
  const confirmStartSubtask = async () => {
    if (!subtaskToStart) return;
    
    // Clear any previous timer state since this is a fresh start
    timerStateStore.clearState();
    
    // Store the selected material for the active subtask
    setActiveMaterial(selectedMaterial?.material || null);
    
    await startEngagement(subtaskToStart.id);
    setActiveSubtask(subtaskToStart);
    setShowStartModal(false);
    setSubtaskToStart(null);
  };

  // Resume engagement and show active subtask screen
  const confirmResumeSubtask = async () => {
    if (!subtaskToStart) return;
    
    // Remove from paused set
    setPausedSubtasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(subtaskToStart.id);
      return newSet;
    });
    
    // For resumed subtasks, we might not have a selected material from the modal
    // but we should keep any previously stored material
    if (selectedMaterial?.material) {
      setActiveMaterial(selectedMaterial.material);
    }
    
    // Start engagement again
    await startEngagement(subtaskToStart.id);
    setActiveSubtask(subtaskToStart);
    setShowResumeModal(false);
    setSubtaskToStart(null);
  };

  // Complete subtask from active subtask screen
  const handleCompleteActiveSubtask = async () => {
    if (!activeSubtask) return;
    await endEngagement(activeSubtask.id);
    // Mark as complete in backend and update UI
    await handleToggleSubtask(activeSubtask.id, true);
    setActiveSubtask(null);
    setActiveMaterial(null); // Clear active material
    // Clear timer state since subtask is completed
    timerStateStore.clearState();
    // Note: Analytics update will be triggered by the parent component's onSubtaskToggled callback
  };

  // Back button handler
  const handleBackFromActiveSubtask = () => {
    if (activeSubtask) {
      // Save the current timer state before adding to paused subtasks
      const currentTimerState = timerStateStore.getState();
      if (currentTimerState) {
        timerStateStore.setState({
          ...currentTimerState,
          subtaskId: activeSubtask.id,
          timestamp: Date.now()
        });
      }
      setPausedSubtasks(prev => new Set(prev).add(activeSubtask.id));
    }
    setActiveSubtask(null);
    setActiveMaterial(null); // Clear active material when going back
    // Don't clear timer state - we want to preserve it for when they resume
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

  // Helper function to check if a subtask is overdue
  const isSubtaskOverdue = (subtask: Subtask) => {
    // If subtask is completed, it's not overdue
    if (subtask.completed) {
      return false;
    }
    
    // Get the subtask's due date - prioritize subtask's own end_time from calendar
    let dueDate: Date | null = null;
    
    if (subtask.end_time) {
      // Use subtask's scheduled end time from calendar
      dueDate = new Date(subtask.end_time);
    } else if (subtask.task_due_date) {
      // Fall back to task's due date if subtask doesn't have its own
      dueDate = new Date(subtask.task_due_date);
    }
    
    // If no due date at all, it's not overdue
    if (!dueDate) {
      return false;
    }
    
    // Compare with current time
    const now = new Date();
    
    // For date-only comparison (without time), reset time to start of day
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return dueDateOnly < todayOnly;
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

  // Helper function to get subtask type badge styling
  const getSubtaskTypeBadge = (type: string | null | undefined) => {
    const normalizedType = type || 'other';
    
    const typeStyles = {
      reading: 'bg-blue-100 text-blue-800',
      flashcard: 'bg-green-100 text-green-800', 
      quiz: 'bg-purple-100 text-purple-800',
      practice: 'bg-orange-100 text-orange-800',
      review: 'bg-yellow-100 text-yellow-800',
      other: 'bg-gray-100 text-gray-800'
    };

    return {
      className: typeStyles[normalizedType as keyof typeof typeStyles] || typeStyles.other,
      label: normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1)
    };
  };

  // Helper function to render the appropriate material viewer
  const renderMaterialViewer = () => {
    if (!activeMaterial) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg">No material selected for this subtask</p>
            <p className="text-sm">Go back and select a material to study with</p>
          </div>
        </div>
      );
    }

    // Determine material type based on file extension or content type
    const materialType = getMaterialType(activeMaterial);
    
    switch (materialType) {
      case 'pdf':
        return (
          <div className="flex-1 overflow-hidden">
            <AnnotatablePDFViewer url={getMaterialUrl(activeMaterial)} />
          </div>
        );
      
      case 'quiz':
        return (
          <div className="flex-1 overflow-y-auto">
            <QuizMaterialLoader 
              material={activeMaterial} 
              courseId={courseId || ''}
            />
          </div>
        );
      
      case 'flashcards':
        return (
          <div className="flex-1 overflow-y-auto">
            <FlashcardMaterialLoader 
              material={activeMaterial} 
              courseId={courseId || ''}
            />
          </div>
        );
      
      default:
        return (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg">Unsupported material type</p>
              <p className="text-sm">Material type: {materialType}</p>
            </div>
          </div>
        );
    }
  };

  // Helper function to determine material type
  const getMaterialType = (material: any): string => {
    if (!material) return 'unknown';
    
    // First check the file_type field from the database
    const fileType = material.file_type || material.type;
    if (fileType === 'quiz') return 'quiz';
    if (fileType === 'flashcards') return 'flashcards';
    
    // Check if it's a quiz object (has questions array) - for direct quiz data
    if (material.questions && Array.isArray(material.questions)) {
      return 'quiz';
    }
    
    // Check if it's flashcards object (has flashcards array) - for direct flashcard data
    if (material.flashcards && Array.isArray(material.flashcards)) {
      return 'flashcards';
    }
    
    // Check content type for saved materials
    const contentType = material.content_type || '';
    if (contentType === 'application/json' && fileType === 'quiz') {
      return 'quiz';
    }
    if (contentType === 'application/json' && fileType === 'flashcards') {
      return 'flashcards';
    }
    
    // Check material name patterns as fallback
    const materialName = material.material_name || material.filename || '';
    if (materialName.toLowerCase().includes('quiz')) {
      return 'quiz';
    }
    if (materialName.toLowerCase().includes('flashcard')) {
      return 'flashcards';
    }
    
    // Check file extension for PDFs
    const filename = material.filename || material.material_name || '';
    if (filename.toLowerCase().endsWith('.pdf')) {
      return 'pdf';
    }
    
    // Check content type for PDFs
    if (contentType.includes('pdf')) {
      return 'pdf';
    }
    
    // Default fallback for uploaded files
    return 'pdf';
  };

  // Helper function to get material URL
  const getMaterialUrl = (material: any): string => {
    // If material has a direct URL
    if (material.url) return material.url;
    
    // If material has an S3 key, construct the URL
    if (material.s3_key) {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      return `${api}/api/materials/file/${material.s3_key}`;
    }
    
    // If material has an ID, construct URL from that
    if (material.id) {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      return `${api}/api/materials/${material.id}/content`;
    }
    
    // Fallback
    return '';
  };

  // Material loader components for quiz and flashcard materials
  const QuizMaterialLoader: React.FC<{ material: any; courseId: string }> = ({ material, courseId }) => {
    const [quizData, setQuizData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      const loadQuizData = async () => {
        try {
          setLoading(true);
          const token = localStorage.getItem('token');
          const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
          
          // If the material already has quiz data (direct quiz object), use it
          if (material.questions && Array.isArray(material.questions)) {
            setQuizData(material);
            setLoading(false);
            return;
          }
          
          // Otherwise, fetch from backend
          const response = await fetch(`${api}/api/courses/${courseId}/materials/${material.id}/quiz-data`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (!response.ok) {
            throw new Error('Failed to load quiz data');
          }
          
          const data = await response.json();
          setQuizData(data.quiz_data);
        } catch (error) {
          console.error('Error loading quiz data:', error);
          setError('Failed to load quiz data');
        } finally {
          setLoading(false);
        }
      };

      loadQuizData();
    }, [material, courseId]);

    if (loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading quiz...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center text-red-600">
            <p>{error}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-6">
        <QuizViewer quizData={quizData} />
      </div>
    );
  };

  const FlashcardMaterialLoader: React.FC<{ material: any; courseId: string }> = ({ material, courseId }) => {
    const [flashcardData, setFlashcardData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      const loadFlashcardData = async () => {
        try {
          setLoading(true);
          const token = localStorage.getItem('token');
          const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
          
          // If the material already has flashcard data (direct flashcard object), use it
          if (material.flashcards && Array.isArray(material.flashcards)) {
            setFlashcardData(material);
            setLoading(false);
            return;
          }
          
          // Otherwise, fetch from backend
          const response = await fetch(`${api}/api/courses/${courseId}/materials/${material.id}/flashcards`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (!response.ok) {
            throw new Error('Failed to load flashcard data');
          }
          
          const data = await response.json();
          setFlashcardData(data.flashcards_data);
        } catch (error) {
          console.error('Error loading flashcard data:', error);
          setError('Failed to load flashcard data');
        } finally {
          setLoading(false);
        }
      };

      loadFlashcardData();
    }, [material, courseId]);

    if (loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p>Loading flashcards...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center text-red-600">
            <p>{error}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-6">
        <FlashcardViewer flashcardData={flashcardData} />
      </div>
    );
  };

  // Render active subtask screen if activeSubtask is set
  if (activeSubtask) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-row items-stretch">
        {/* Main content area with PDF reading */}
        <div className="flex-1 flex flex-col">
          {/* Header with Working on text and Complete button */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Working on: {activeSubtask.name}</h2>
              {activeMaterial && (
                <p className="text-sm text-gray-600 mt-1">
                  Material: {activeMaterial.material_name || activeMaterial.filename || 'Selected Material'}
                </p>
              )}
            </div>
            <button
              onClick={handleCompleteActiveSubtask}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Complete Subtask
            </button>
          </div>
          
          {/* Material content */}
          {renderMaterialViewer()}
          
          {/* Back button at bottom */}
          <div className="p-6 border-t border-gray-200">
            <button
              onClick={handleBackFromActiveSubtask}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
        
        {/* Timer sidebar */}
        <div className="w-[400px] bg-gray-50 border-l border-gray-200 flex flex-col items-center justify-center p-8">
          <AudioProvider>
            <TimerProvider 
              autoStart={true}
              initialTimerState={timerStateStore.getState()?.subtaskId === activeSubtask.id ? timerStateStore.getState() : undefined}
            >
              <UnifiedTimer />
            </TimerProvider>
          </AudioProvider>
        </div>
      </div>
    );
  }

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
              className={`flex items-center gap-3 p-3 rounded-lg border hover:shadow-sm transition-shadow ${
                isSubtaskOverdue(subtask)
                  ? 'bg-red-50 border-red-200'
                  : 'bg-white border-gray-200'
              }`}
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
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm ${
                          subtask.completed 
                            ? 'text-gray-500 line-through' 
                            : isSubtaskOverdue(subtask)
                              ? 'text-red-600 underline cursor-pointer'
                              : 'text-gray-800 underline cursor-pointer'
                        }`}
                        onClick={subtask.completed ? undefined : () => handleSubtaskClick(subtask)}
                      >
                      {subtask.name}
                    </p>
                    {/* Subtask Type Badge */}
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getSubtaskTypeBadge(subtask.type).className}`}
                    >
                      {getSubtaskTypeBadge(subtask.type).label}
                    </Badge>
                      {isSubtaskOverdue(subtask) && !subtask.completed && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                          Overdue
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                {/* Schedule/Edit Time Button */}
                <button
                  onClick={() => {
                    const dueDateForUrl = taskDueDate ? new Date(taskDueDate).toISOString().split('T')[0] : '';
                    const isScheduled = subtask.start_time && subtask.end_time;
                    
                    const params = new URLSearchParams({
                      scheduleSubtaskId: subtask.id,
                      subtaskName: encodeURIComponent(subtask.name),
                      subtaskType: subtask.type || 'other',
                      taskId: taskId,
                      taskDueDate: dueDateForUrl,
                      taskName: encodeURIComponent(taskName || ''),
                      goalId: goalId || '',
                      courseId: courseId || '',
                      isEdit: isScheduled ? 'true' : 'false'
                    });
                    
                    if (isScheduled && subtask.start_time && subtask.end_time) {
                      // Add existing timing data for editing
                      params.set('currentStartTime', subtask.start_time);
                      params.set('currentEndTime', subtask.end_time);
                    }
                    
                    router.push(`/calendar?${params.toString()}`);
                  }}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    subtask.start_time && subtask.end_time
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                  title={subtask.start_time && subtask.end_time ? 'Edit scheduled time' : 'Schedule time'}
                >
                  {subtask.start_time && subtask.end_time ? 'Edit Time' : 'Schedule'}
                </button>

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

      {/* Start Subtask Modal */}
      {showStartModal && subtaskToStart && (
        <Portal>
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999]" onClick={() => setShowStartModal(false)}>
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full relative" onClick={e => e.stopPropagation()}>
              <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowStartModal(false)}>
                <span className="text-xl">&times;</span>
              </button>
              <h3 className="text-lg font-semibold mb-4 text-center">Start Subtask</h3>
              <p className="text-center mb-6">Do you want to start "{subtaskToStart.name}"?</p>
              <div className="flex gap-2 mt-4">
            <button
                  onClick={() => setShowStartModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
                  onClick={confirmStartSubtask}
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
            >
                  Start
            </button>
          </div>
        </div>
          </div>
        </Portal>
      )}

      {/* Resume Subtask Modal */}
      {showResumeModal && subtaskToStart && (
        <Portal>
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999]" onClick={() => setShowResumeModal(false)}>
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full relative" onClick={e => e.stopPropagation()}>
              <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowResumeModal(false)}>
                <span className="text-xl">&times;</span>
              </button>
              <h3 className="text-lg font-semibold mb-4 text-center">Resume Subtask</h3>
              <p className="text-center mb-6">Do you want to resume "{subtaskToStart.name}"?</p>
              <div className="flex gap-2 mt-4">
            <button
                  onClick={() => setShowResumeModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
        <button
                  onClick={confirmResumeSubtask}
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
        >
                  Resume
        </button>
          </div>
        </div>
          </div>
        </Portal>
      )}
      
      {/* Materials Modal */}
      {showMaterialsModal && subtaskToStart && (
        <Portal>
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999]" onClick={() => setShowMaterialsModal(false)}>
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full relative" onClick={e => e.stopPropagation()}>
              <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setShowMaterialsModal(false)}>
                <span className="text-xl">&times;</span>
              </button>
              <h3 className="text-lg font-semibold mb-4 text-center">Materials</h3>
              <p className="text-center mb-6">Choose how you want to work on "{subtaskToStart.name}"</p>
              
              {/* Tab Navigation */}
              <div className="flex border-b border-gray-200 mb-4">
                <button
                  onClick={() => setActiveTab('select')}
                  className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'select'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Select Material
                </button>
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'upload'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Upload Material
                </button>
                <button
                  onClick={() => setActiveTab('generate')}
                  className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'generate'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Generate Material
                </button>
              </div>

              {/* Tab Content */}
              <div className="space-y-4">
                {activeTab === 'select' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Material to Study
                      </label>
                      <Select
                        value={selectedMaterial}
                        onChange={setSelectedMaterial}
                        options={courseMaterials.map(material => ({
                          value: material.id,
                          label: material.material_name || material.filename || 'Unnamed Material',
                          material: material
                        }))}
                        placeholder={loadingMaterials ? "Loading materials..." : "Choose a material..."}
                        isLoading={loadingMaterials}
                        isDisabled={loadingMaterials}
                        className="react-select-container"
                        classNamePrefix="react-select"
                        styles={{
                          control: (provided) => ({
                            ...provided,
                            minHeight: '42px',
                            borderColor: '#d1d5db',
                            '&:hover': {
                              borderColor: '#9ca3af'
                            }
                          }),
                          option: (provided, state) => ({
                            ...provided,
                            backgroundColor: state.isSelected 
                              ? '#3b82f6' 
                              : state.isFocused 
                                ? '#eff6ff' 
                                : 'white',
                            color: state.isSelected ? 'white' : '#374151',
                            padding: '12px 16px',
                            '&:hover': {
                              backgroundColor: state.isSelected ? '#3b82f6' : '#eff6ff'
                            }
                          }),
                          placeholder: (provided) => ({
                            ...provided,
                            color: '#9ca3af'
                          })
                        }}
                      />
                      {courseMaterials.length === 0 && !loadingMaterials && (
                        <p className="text-sm text-gray-500 mt-2">
                          No materials found. Upload some materials in the Materials tab to get started.
                        </p>
                      )}
                    </div>
                    
                    <button
                      onClick={() => {
                        if (!selectedMaterial) {
                          toast.error('Please select a material first');
                          return;
                        }
                        setShowMaterialsModal(false);
                        setShowStartModal(true);
                      }}
                      disabled={!selectedMaterial}
                      className={`w-full py-3 px-4 rounded-md transition-colors flex items-center justify-center gap-2 ${
                        selectedMaterial 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <span>📚</span>
                      Continue with Selected Material
                    </button>
                  </div>
                )}

                {activeTab === 'upload' && (
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-4">Upload a new file to work with</p>
                    <button
                      onClick={() => {
                        setShowMaterialsModal(false);
                        // TODO: Navigate to upload material page
                        console.log('Navigate to upload material');
                      }}
                      className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <span>📤</span>
                      Upload Material
                    </button>
                  </div>
                )}

                {activeTab === 'generate' && (
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-4">Generate new material using AI</p>
                    <button
                      onClick={() => {
                        setShowMaterialsModal(false);
                        // TODO: Navigate to generate material page
                        console.log('Navigate to generate material');
                      }}
                      className="w-full bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <span>🤖</span>
                      Generate Material
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowMaterialsModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowMaterialsModal(false);
                    setShowStartModal(true);
                  }}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                >
                  Next
                </button>
              </div>
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