"use client"

import React, { useState, useEffect } from 'react';
import { Upload, File, Trash2, Eye, Download, AlertCircle, CheckCircle, Loader2, Pin } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Portal } from '../../../../components/Portal';
import dynamic from 'next/dynamic';

// Dynamically import the AnnotatablePDFViewer to avoid SSR issues with PDF.js
const AnnotatablePDFViewer = dynamic(
  () => import('@/components/courses/AnnotatablePDFViewer'),
  { ssr: false, loading: () => <div className="flex items-center justify-center p-8">Loading PDF viewer...</div> }
);

interface UploadedFile {
  id: string;
  filename: string;
  user_id: number | null;
  uploaded_at: string;
  chunk_count: number;
  url: string;
  size: number;
  last_modified: string;
  pinned?: boolean;
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
  const [pinnedFiles, setPinnedFiles] = useState<Set<string>>(new Set());

  // Fetch uploaded files for this course
  const fetchFiles = async () => {
    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const response = await fetch(`${api}/api/courses/${courseId}/materials`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      
      const data = await response.json();
      
      // Map S3 files to the expected format
      const mappedFiles = data.map((f: any) => ({
        id: f.key,
        filename: f.key.split("/").pop() || f.key,
        user_id: null, // Not provided by S3 API
        uploaded_at: f.last_modified || new Date().toISOString(),
        chunk_count: 0, // Not available for course materials yet
        url: f.url,
        size: f.size,
        last_modified: f.last_modified || new Date().toISOString()
      }));
      
      setFiles(mappedFiles);
    } catch (err) {
      setError('Failed to load files');
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPinnedFiles();
    fetchFiles();
  }, [courseId]);

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

  // Delete file
  const handleDeleteFile = async (fileId: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) return;

    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const response = await fetch(`${api}/api/courses/${courseId}/materials/${encodeURIComponent(fileId)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      setSuccess(`Deleted "${filename}"`);
      await fetchFiles();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to delete file');
      console.error('Delete error:', err);
    }
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

  const getFileTypeFromName = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'PDF';
      case 'txt': return 'TXT';
      case 'docx': case 'doc': return 'DOCX';
      default: return 'Unknown';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Preview modal component
  const isImage = (url: string) => /\.png|\.jpe?g|\.gif|\.bmp|\.webp/i.test(url);
  const isPDF = (url: string) => url.toLowerCase().includes('.pdf');

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
  const loadPinnedFiles = () => {
    try {
      const saved = localStorage.getItem(`pinnedFiles-${courseId}`);
      if (saved) {
        setPinnedFiles(new Set(JSON.parse(saved)));
      }
    } catch (error) {
      console.error('Error loading pinned files:', error);
    }
  };

  // Save pinned files to localStorage
  const savePinnedFiles = (pinned: Set<string>) => {
    try {
      localStorage.setItem(`pinnedFiles-${courseId}`, JSON.stringify(Array.from(pinned)));
    } catch (error) {
      console.error('Error saving pinned files:', error);
    }
  };

  // Toggle pin status for a file
  const togglePin = (fileId: string) => {
    setPinnedFiles(prev => {
      const newPinned = new Set(prev);
      if (newPinned.has(fileId)) {
        newPinned.delete(fileId);
      } else {
        newPinned.add(fileId);
      }
      savePinnedFiles(newPinned);
      return newPinned;
    });
  };

  // Sort files with pinned files first
  const sortedFiles = [...files].sort((a, b) => {
    const aPinned = pinnedFiles.has(a.id);
    const bPinned = pinnedFiles.has(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
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
                      pinnedFiles.has(file.id) ? 'border-yellow-300/50 bg-yellow-50/30' : 'border-gray-200/50 bg-white/20'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        {pinnedFiles.has(file.id) && (
                          <Pin className="w-4 h-4 text-yellow-500" />
                        )}
                        <File className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{file.filename}</p>
                            {pinnedFiles.has(file.id) && (
                              <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                                Pinned
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>Uploaded {formatDate(file.uploaded_at)}</span>
                            <Badge variant="outline">{getFileTypeFromName(file.filename)}</Badge>
                            <Badge variant="secondary">{formatFileSize(file.size)}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewUrl(file.url)}
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
                        onClick={() => handleDeleteFile(file.id, file.filename)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => togglePin(file.id)}
                        className={`${
                          pinnedFiles.has(file.id) 
                            ? 'bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200' 
                            : 'hover:text-yellow-600'
                        }`}
                        title={pinnedFiles.has(file.id) ? 'Unpin from top' : 'Pin to top'}
                      >
                        <Pin className={`w-4 h-4 ${pinnedFiles.has(file.id) ? 'fill-current' : ''}`} />
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
        </div>
    </div>
  );
}
