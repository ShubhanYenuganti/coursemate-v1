"use client"

import React, { useState, useEffect } from 'react';
import { Upload, File, Trash2, Eye, Download, AlertCircle, CheckCircle, Loader2, Pin, Edit2, Save, X, Brain } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Portal } from '../../../../components/Portal';
import dynamic from 'next/dynamic';

// Dynamically import the AnnotatablePDFViewer to avoid SSR issues with PDF.js
const AnnotatablePDFViewer = dynamic(
  () => import('@/components/courses/AnnotatablePDFViewer'),
  { ssr: false, loading: () => <div className="flex items-center justify-center p-8">Loading PDF viewer...</div> }
);

// Dynamically import the QuizViewer
const QuizViewer = dynamic(
  () => import('../QuizViewer'),
  { ssr: false, loading: () => <div className="flex items-center justify-center p-8">Loading quiz...</div> }
);

// Dynamically import the FlashcardViewer
const FlashcardViewer = dynamic(
  () => import('../FlashcardViewer'),
  { ssr: false, loading: () => <div className="flex items-center justify-center p-8">Loading flashcards...</div> }
);

interface UploadedFile {
  id: string;
  filename?: string;
  material_name?: string;
  user_id: number | null;
  uploaded_at: string;
  created_at?: string;
  chunk_count: number;
  url: string;
  size: number;
  file_size?: number;
  content_type: string;
  file_type?: string;
  is_pinned?: boolean;
  thumbnail_url?: string;
  original_filename?: string;
}

interface MaterialsManagerCourseProps {
  courseId: string;
}

export default function MaterialsManagerCourse({ courseId }: MaterialsManagerCourseProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [quizData, setQuizData] = useState<any>(null);
  const [showQuizViewer, setShowQuizViewer] = useState(false);
  const [flashcardData, setFlashcardData] = useState<any>(null);
  const [showFlashcardViewer, setShowFlashcardViewer] = useState(false);
  const [pinnedFiles, setPinnedFiles] = useState<Set<string>>(new Set());
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editedFilename, setEditedFilename] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ id: string; filename: string } | null>(null);

  // Fetch uploaded files for this course
  const fetchFiles = async () => {
    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const response = await fetch(`${api}/api/courses/${courseId}/materials/db`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      
      const data = await response.json();
      
      // Map DB materials to UploadedFile format to match MaterialsList.tsx
      const mappedFiles = data.map((f: any) => ({
        id: f.id,
        filename: f.material_name,
        material_name: f.material_name,
        user_id: f.user_id,
        uploaded_at: f.created_at || f.uploaded_at,
        created_at: f.created_at,
        chunk_count: 0,
        url: f.url || (f.file_path?.startsWith('http') ? f.file_path : `${api}/${f.file_path}`),
        size: f.file_size || 0,
        file_size: f.file_size,
        content_type: f.file_type || 'application/octet-stream',
        file_type: f.file_type,
        is_pinned: f.is_pinned,
        thumbnail_url: f.thumbnail_url,
        original_filename: f.original_filename
      }));
      
      setFiles(mappedFiles);
      
      // Update pinned files state based on database
      const pinnedSet = new Set<string>();
      mappedFiles.forEach((f: UploadedFile) => {
        if (f.is_pinned) {
          pinnedSet.add(f.id);
        }
      });
      setPinnedFiles(pinnedSet);
      
    } catch (err) {
      setError('Failed to load files');
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [courseId]);

  // Load quiz data from backend endpoint to avoid CORS issues
  const loadQuizData = async (materialId: string) => {
    try {
      const token = localStorage.getItem('token');
      const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5173";
      const endpoint = `${api}/api/courses/${courseId}/materials/${materialId}/quiz-data`;
      
      console.log('Loading quiz data from backend:', endpoint);
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      console.log('Response status:', response.status, 'OK:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`Failed to load quiz data: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Quiz data loaded successfully:', data);
      setQuizData(data.quiz_data);
      setShowQuizViewer(true);
    } catch (error) {
      console.error('Error loading quiz data:', error);
      setError('Failed to load quiz data');
    }
  };

  // Load flashcard data from backend endpoint
  const loadFlashcardData = async (materialId: string) => {
    try {
      const token = localStorage.getItem('token');
      const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5173";
      const endpoint = `${api}/api/courses/${courseId}/materials/${materialId}/flashcards`;
      
      console.log('Loading flashcard data from backend:', endpoint);
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      console.log('Response status:', response.status, 'OK:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`Failed to load flashcard data: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Flashcard data loaded successfully:', data);
      setFlashcardData(data.flashcards_data);
      setShowFlashcardViewer(true);
    } catch (error) {
      console.error('Error loading flashcard data:', error);
      setError('Failed to load flashcard data');
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (!allowedTypes.includes(file.type)) {
      setError('Unsupported file type. Please upload PDF, TXT, or DOCX files.');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      
      console.log('Uploading file to:', `${api}/api/courses/${courseId}/materials/upload`);
      console.log('File details:', { name: file.name, size: file.size, type: file.type });
      console.log('Course ID:', courseId);
      const response = await fetch(`${api}/api/courses/${courseId}/materials/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        console.error('Upload response not OK:', response.status, response.statusText);
        try {
          const errorData = await response.json();
          console.error('Upload error data:', errorData);
          throw new Error(errorData.error || `Upload failed with status ${response.status}`);
        } catch (jsonError) {
          console.error('Could not parse error response as JSON:', jsonError);
          throw new Error(`Upload failed with status ${response.status}: ${response.statusText}`);
        }
      }

      const data = await response.json();
      setSuccess(`Successfully uploaded "${file.name}"`);
      
      // Refresh files list
      await fetchFiles();
      
      // Reset file input
      event.target.value = '';
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
      setTimeout(() => {
        setUploadProgress(0);
        setSuccess(null);
      }, 3000);
    }
  };

  // Delete file - now just shows confirmation modal
  const handleDeleteFile = (fileId: string, filename: string) => {
    showDeleteConfirmation(fileId, filename);
  };

  // View file chunks (placeholder for now)
  const handleViewChunks = async (fileId: string, filename: string) => {
    setError('Chunk viewing for course materials is not yet available. This feature will be added when course-specific vector storage is implemented.');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileTypeFromName = (filename?: string, fileType?: string) => {
    // First try to use the file_type from database
    if (fileType) {
      if (fileType.toLowerCase() === 'quiz') return 'QUIZ';
      if (fileType.toLowerCase() === 'flashcards') return 'FLASHCARDS';
      return fileType.toUpperCase();
    }
    
    // Fallback to filename extension
    if (!filename) return 'Unknown';
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'PDF';
      case 'txt': return 'TXT';
      case 'docx': case 'doc': return 'DOCX';
      case 'png': return 'PNG';
      case 'jpg': case 'jpeg': return 'JPG';
      default: return 'Unknown';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Preview modal component
  const isImage = (url: string) => /\.png|\.jpe?g|\.gif|\.bmp|\.webp/i.test(url);
  const isPDF = (url: string) => url.toLowerCase().includes('.pdf');
  const isQuiz = (file: UploadedFile) => file.file_type === 'quiz' || file.content_type === 'quiz';
  const isFlashcard = (file: UploadedFile) => file.file_type === 'flashcards' || file.content_type === 'flashcards';

  const PreviewModal: React.FC<{ url: string | null; onClose: () => void }> = ({ url, onClose }) => {
    if (!url) return null;
    return (
      <Portal>
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[9999]"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={onClose}
        >
          <div 
            className="bg-transparent rounded-lg relative overflow-hidden"
            style={{ 
              width: isPDF(url) ? '98vw' : 'auto',
              height: isPDF(url) ? '95vh' : 'auto',
              maxWidth: isPDF(url) ? '1800px' : '95vw',
              maxHeight: '95vh'
            }}
            onClick={e => e.stopPropagation()}
          >
            <button 
              className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 rounded-full p-2 text-white hover:text-gray-200 z-10"
              onClick={onClose}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div className="flex-1 overflow-auto h-full">
              {isImage(url) ? (
                <img src={url} alt="Preview" className="max-w-full max-h-[90vh] object-contain" />
              ) : isPDF(url) ? (
                <div className="w-full h-full" style={{ minHeight: '900px' }}>
                  <AnnotatablePDFViewer url={url} />
                </div>
              ) : (
                <div className="p-8 text-center bg-white/90 backdrop-blur rounded-lg">
                  <p className="text-lg mb-4">Preview not available for this file type.</p>
                  <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Open in new tab
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </Portal>
    );
  };

  // Load pinned files from localStorage
  // Start editing a filename
  const startEditing = (fileId: string, currentFilename: string) => {
    setEditingFile(fileId);
    setEditedFilename(currentFilename);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingFile(null);
    setEditedFilename('');
  };

  // Save the edited filename
  const saveFilename = async (fileId: string) => {
    if (!editedFilename.trim()) {
      setError('Filename cannot be empty');
      return;
    }

    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      
      // Store original filename for potential revert
      const originalFile = files.find(f => f.id === fileId);
      const originalFilename = originalFile?.filename || originalFile?.material_name;
      
      // Optimistically update the UI first
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { 
          ...f, 
          filename: editedFilename.trim(),
          material_name: editedFilename.trim() 
        } : f
      ));

      const response = await fetch(`${api}/api/courses/${courseId}/materials/db/${fileId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ material_name: editedFilename.trim() })
      });

      if (!response.ok) {
        throw new Error('Failed to rename file');
      }

      setEditingFile(null);
      setEditedFilename('');
      setSuccess('File renamed successfully');

    } catch (err) {
      console.error('Error renaming file:', err);
      setError('Failed to rename file');
      
      // Revert the UI update if the request fails
      const originalFile = files.find(f => f.id === fileId);
      const originalFilename = originalFile?.filename || originalFile?.material_name;
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { 
          ...f, 
          filename: originalFilename,
          material_name: originalFilename 
        } : f
      ));
    }
  };

  // Show delete confirmation modal
  const showDeleteConfirmation = (fileId: string, filename: string) => {
    setFileToDelete({ id: fileId, filename });
    setShowConfirmModal(true);
  };

  // Cancel delete
  const cancelDelete = () => {
    setFileToDelete(null);
    setShowConfirmModal(false);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!fileToDelete) return;

    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const response = await fetch(`${api}/api/courses/${courseId}/materials/db/${fileToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      // Remove from local state
      setFiles(prev => prev.filter(f => f.id !== fileToDelete.id));
      setPinnedFiles(prev => {
        const newPinned = new Set(prev);
        newPinned.delete(fileToDelete.id);
        return newPinned;
      });

      setSuccess(`File "${fileToDelete.filename}" deleted successfully`);
      setFileToDelete(null);
      setShowConfirmModal(false);

    } catch (err) {
      console.error('Error deleting file:', err);
      setError('Failed to delete file');
    }
  };

  // Toggle pin status for a file
  const togglePin = async (fileId: string) => {
    try {
      const currentlyPinned = pinnedFiles.has(fileId);
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      
      // Optimistically update the UI first
      setPinnedFiles(prev => {
        const newPinned = new Set(prev);
        if (currentlyPinned) {
          newPinned.delete(fileId);
        } else {
          newPinned.add(fileId);
        }
        return newPinned;
      });

      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, is_pinned: !currentlyPinned } : f
      ));
      
      const response = await fetch(`${api}/api/courses/${courseId}/materials/db/${fileId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_pinned: !currentlyPinned })
      });

      if (!response.ok) {
        throw new Error('Failed to update pin status');
      }

    } catch (err) {
      console.error('Error toggling pin:', err);
      setError('Failed to update pin status');
      
      // Revert the UI update if the request fails
      const currentlyPinned = !pinnedFiles.has(fileId); // Opposite of what we set above
      setPinnedFiles(prev => {
        const newPinned = new Set(prev);
        if (currentlyPinned) {
          newPinned.delete(fileId);
        } else {
          newPinned.add(fileId);
        }
        return newPinned;
      });

      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, is_pinned: currentlyPinned } : f
      ));
    }
  };

  // Sort files with pinned files first
  const sortedFiles = [...files].sort((a, b) => {
    const aPinned = a.is_pinned || false;
    const bPinned = b.is_pinned || false;
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    
    // Sort by date (use created_at if available, fallback to uploaded_at)
    const aDate = a.created_at || a.uploaded_at;
    const bDate = b.created_at || b.uploaded_at;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-lg">
      <div className="flex-1 p-4">
        <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Course Materials</h2>
            <p className="text-gray-600">Upload and manage materials for this course</p>
          </div>
          <Badge variant="secondary">{files.length} files</Badge>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Upload Section */}
        <Card className="bg-transparent border-gray-200/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Materials
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300/50 rounded-lg p-6 text-center bg-gray-50/30 backdrop-blur-sm">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <div className="space-y-2">
                <p className="text-lg font-medium">Drop files here or click to upload</p>
                <p className="text-sm text-gray-500">
                  Supports PDF, TXT, and DOCX files (max 10MB)
                </p>
              </div>
              <input
                type="file"
                onChange={handleFileUpload}
                accept=".pdf,.txt,.docx,.doc"
                disabled={uploading}
                className="mt-4 block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-100/50 file:text-blue-700 hover:file:bg-blue-200/50 disabled:opacity-50 backdrop-blur-sm"
              />
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-xs text-gray-500">
                  Extracting text, generating embeddings, and processing for AI chat...
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Files List */}
        <Card className="bg-transparent border-gray-200/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <File className="w-5 h-5" />
              Course Materials
            </CardTitle>
          </CardHeader>
          <CardContent>
            {files.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <File className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No materials uploaded yet</p>
                <p className="text-sm">Upload some materials to get started with AI chat</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center justify-between p-4 border rounded-lg hover:bg-white/50 backdrop-blur-sm ${
                      file.is_pinned ? 'border-yellow-300/50 bg-yellow-50/30' : 'border-gray-200/50 bg-white/20'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        {/* Thumbnail */}
                        {file.thumbnail_url ? (
                          <img 
                            src={file.thumbnail_url} 
                            alt="Thumbnail" 
                            className="w-10 h-10 object-cover rounded border border-gray-200" 
                          />
                        ) : (
                          <>
                            {isQuiz(file) ? (
                              <Brain className="w-5 h-5 text-purple-600" />
                            ) : isFlashcard(file) ? (
                              <Brain className="w-5 h-5 text-green-600" />
                            ) : (
                              <File className="w-5 h-5 text-blue-600" />
                            )}
                          </>
                        )}
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {editingFile === file.id ? (
                              <div className="flex items-center gap-2 flex-1">
                                <Input
                                  value={editedFilename}
                                  onChange={(e) => setEditedFilename(e.target.value)}
                                  className="h-8 flex-1"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      saveFilename(file.id);
                                    } else if (e.key === 'Escape') {
                                      cancelEditing();
                                    }
                                  }}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => saveFilename(file.id)}
                                  className="h-8 px-2"
                                >
                                  <Save className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEditing}
                                  className="h-8 px-2"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <p className="font-medium">{file.filename || file.material_name || 'Unnamed file'}</p>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => startEditing(file.id, file.filename || file.material_name || 'unnamed')}
                                  className="h-6 px-1 text-gray-400 hover:text-gray-600"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                            
                            {file.is_pinned && (
                              <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                                Pinned
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>Uploaded {formatDate(file.uploaded_at || file.created_at || '')}</span>
                            <Badge 
                              variant={isQuiz(file) || isFlashcard(file) ? "default" : "outline"}
                              className={
                                isQuiz(file) ? "bg-purple-600 hover:bg-purple-700" : 
                                isFlashcard(file) ? "bg-green-600 hover:bg-green-700" : ""
                              }
                            >
                              {getFileTypeFromName(file.filename, file.file_type)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (isQuiz(file)) {
                            loadQuizData(file.id);
                          } else if (isFlashcard(file)) {
                            loadFlashcardData(file.id);
                          } else {
                            setPreviewUrl(file.url);
                          }
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(file.url, '_blank')}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteFile(file.id, file.filename || file.material_name || 'unnamed file')}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => togglePin(file.id)}
                        className={`${
                          file.is_pinned 
                            ? 'bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200' 
                            : 'hover:text-yellow-600'
                        }`}
                        title={file.is_pinned ? 'Unpin from top' : 'Pin to top'}
                      >
                        <Pin className={`w-4 h-4 ${file.is_pinned ? 'fill-current' : ''}`} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        {files.length > 0 && (
          <Card className="bg-transparent border-gray-200/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">Materials Ready!</p>
                  <p className="text-sm text-green-700">
                    Your course materials are uploaded and processed. Switch to the "AI Chat" tab to start asking questions about these materials.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Preview Modal */}
      <PreviewModal
        url={previewUrl}
        onClose={() => setPreviewUrl(null)}
      />

      {/* Quiz Viewer Modal */}
      {showQuizViewer && quizData && (
        <Portal>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto overflow-hidden">
              <div className="h-full overflow-y-auto">
                <QuizViewer 
                  quizData={quizData} 
                  onClose={() => {
                    setShowQuizViewer(false);
                    setQuizData(null);
                  }}
                />
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Flashcard Viewer Modal */}
      {showFlashcardViewer && flashcardData && (
        <Portal>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto overflow-hidden">
              <div className="h-full overflow-y-auto">
                <FlashcardViewer 
                  flashcardData={flashcardData} 
                  onClose={() => {
                    setShowFlashcardViewer(false);
                    setFlashcardData(null);
                  }}
                />
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Delete Confirmation Modal */}
      {showConfirmModal && fileToDelete && (
        <Portal>
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Delete File
                </h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete "{fileToDelete.filename}"? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={cancelDelete}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={confirmDelete}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
        </div>
    </div>
  );
}
