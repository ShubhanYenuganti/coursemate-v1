"use client";

import React, { useState } from 'react';
import { Eye, Download, Plus, File, Image, Video, Music, FileText } from 'lucide-react';
import CourseSelector from './CourseSelector';
import PreviewModal from './PreviewModal';
import ConfirmationModal from './ConfirmationModal';

interface MaterialPreview {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  thumbnail_path?: string;
  original_filename?: string;
  file_path: string;
  course_id: string;
}

interface MaterialMessageProps {
  materialPreview: MaterialPreview;
  isOwn: boolean;
  timestamp: string;
  content?: string;
  senderName?: string; // For group messages
  isGroupChat?: boolean; // To determine if we should show sender name
}

const MaterialMessage: React.FC<MaterialMessageProps> = ({
  materialPreview,
  isOwn,
  timestamp,
  content,
  senderName,
  isGroupChat
}) => {
  const [showCourseSelector, setShowCourseSelector] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type.includes('pdf')) return <FileText className="w-6 h-6 text-red-500" />;
    if (type.includes('image')) return <Image className="w-6 h-6 text-green-500" />;
    if (type.includes('video')) return <Video className="w-6 h-6 text-purple-500" />;
    if (type.includes('audio')) return <Music className="w-6 h-6 text-orange-500" />;
    return <File className="w-6 h-6 text-blue-500" />;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleAddToCourse = async (courseId: string, courseTitle: string) => {
    try {
      console.log('➕ [MaterialMessage] Adding material to course:', {
        materialId: materialPreview.id,
        courseId,
        courseTitle,
        materialName: materialPreview.name
      });

      const token = localStorage.getItem('token');
      const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5173";
      const response = await fetch(
        `${api}/api/chat-group/add-material-to-course`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            material_id: materialPreview.id,
            course_id: courseId
          })
        }
      );

      console.log('📊 [MaterialMessage] Add to course response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ [MaterialMessage] Material added to course successfully:', result);
        
        // Close course selector
        setShowCourseSelector(false);
        
        // Show success confirmation
        setConfirmationModal({
          isOpen: true,
          type: 'success',
          title: 'Material Added Successfully!',
          message: `"${materialPreview.name}" has been successfully added to "${courseTitle}" and is now available in your course materials.`
        });
      } else {
        const error = await response.json();
        console.error('❌ [MaterialMessage] Failed to add material to course:', error);
        
        // Close course selector
        setShowCourseSelector(false);
        
        // Show error confirmation
        setConfirmationModal({
          isOpen: true,
          type: 'error',
          title: 'Failed to Add Material',
          message: error.error || 'There was an error adding the material to your course. Please try again.'
        });
      }
    } catch (error) {
      console.error('❌ [MaterialMessage] Error adding material to course:', error);
      
      // Close course selector
      setShowCourseSelector(false);
      
      // Show error confirmation
      setConfirmationModal({
        isOpen: true,
        type: 'error',
        title: 'Failed to Add Material',
        message: 'There was an error adding the material to your course. Please try again.'
      });
    }
  };

  const handleViewMaterial = () => {
    console.log('👀 [MaterialMessage] View material clicked:', {
      materialId: materialPreview.id,
      fileType: materialPreview.file_type,
      filePath: materialPreview.file_path,
      courseId: materialPreview.course_id,
      isPDF: materialPreview.file_type.toLowerCase().includes('pdf')
    });

    if (materialPreview.file_type.toLowerCase().includes('pdf') && materialPreview.file_path) {
      const extractedCourseId = materialPreview.course_id
        ? materialPreview.course_id
        : (materialPreview.file_path.match(/courses\/(.*?)\//)?.[1] || '');
      
      console.log('📄 [MaterialMessage] Opening PDF preview with:', {
        materialId: materialPreview.id,
        courseId: extractedCourseId,
        originalCourseId: materialPreview.course_id,
        extractedFromPath: materialPreview.file_path.match(/courses\/(.*?)\//)?.[1],
        filePath: materialPreview.file_path
      });
      
      setIsViewerOpen(true);
    } else {
      // fallback: open in new tab
      const viewUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/materials/${materialPreview.id}/view`;
      console.log('🔗 [MaterialMessage] Opening in new tab:', viewUrl);
      window.open(viewUrl, '_blank');
    }
  };

  const handleDownloadMaterial = () => {
    console.log('📥 [MaterialMessage] Download material clicked:', {
      materialId: materialPreview.id,
      fileType: materialPreview.file_type,
      fileName: materialPreview.name
    });
    
    // For PDFs and other files, use the backend endpoint that generates signed URLs
    // This will open the file in a new tab (which is what we want for PDFs)
    const token = localStorage.getItem('token');
    const viewUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5173"}/api/materials/${materialPreview.id}/view?token=${encodeURIComponent(token || '')}`;
    
    console.log('🔗 [MaterialMessage] Opening via backend endpoint:', viewUrl);
    window.open(viewUrl, '_blank');
  };

  return (
    <>
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-sm lg:max-w-md rounded-lg ${
            isOwn
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-200 text-gray-900'
          }`}
        >
          {/* Show sender name for group messages (only for messages not from current user) */}
          {!isOwn && senderName && isGroupChat && (
            <div className="px-4 pt-3 pb-1">
              <div className="text-xs text-gray-600 font-medium">
                {senderName}
              </div>
            </div>
          )}
          {/* Text content if any */}
          {content && (
            <div className={`px-4 ${!isOwn && senderName && isGroupChat ? 'pt-1' : 'pt-3'}`}>
              <p className="text-sm">{content}</p>
            </div>
          )}
          {/* Material card */}
          <div className={`p-4 ${content ? 'pt-2' : (!isOwn && senderName && isGroupChat ? 'pt-1' : '')} rounded-lg`}>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {getFileIcon(materialPreview.file_type)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`font-medium text-sm truncate ${
                  isOwn ? 'text-white' : 'text-gray-900'
                }`}>
                  {materialPreview.name}
                </h4>
                {materialPreview.original_filename && 
                 materialPreview.original_filename !== materialPreview.name && (
                  <p className={`text-xs truncate ${
                    isOwn ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {materialPreview.original_filename}
                  </p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs ${
                    isOwn ? 'text-blue-100' : 'text-gray-400'
                  }`}>
                    {formatFileSize(materialPreview.file_size)}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    isOwn 
                      ? 'bg-blue-500 text-blue-100' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {materialPreview.file_type}
                  </span>
                </div>
              </div>
            </div>
            {/* Action buttons */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-opacity-20">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleViewMaterial}
                  className={`p-2 rounded-lg transition-colors ${
                    isOwn
                      ? 'hover:bg-blue-500 text-blue-100 hover:text-white'
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-800'
                  }`}
                  title="View material"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDownloadMaterial}
                  className={`p-2 rounded-lg transition-colors ${
                    isOwn
                      ? 'hover:bg-blue-500 text-blue-100 hover:text-white'
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-800'
                  }`}
                  title="Download material"
                >
                  <Download className="w-4 h-4" />
                </button>
                {!isOwn && (
                  <button
                    onClick={() => setShowCourseSelector(true)}
                    className="p-2 rounded-lg transition-colors hover:bg-green-100 text-green-600 hover:text-green-800"
                    title="Add to my courses"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
              {/* Timestamp */}
              <span className={`text-xs ${
                isOwn ? 'text-blue-100' : 'text-gray-400'
              }`}>
                {formatTime(timestamp)}
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* Preview Modal for PDF */}
      {isViewerOpen && materialPreview.file_path && (
        <PreviewModal
          url={materialPreview.file_path}
          materialId={materialPreview.id}
          courseId={
            materialPreview.course_id
              ? materialPreview.course_id
              : (materialPreview.file_path.match(/courses\/(.*?)\//)?.[1] || '')
          }
          materialType={materialPreview.file_type}
          onClose={() => {
            console.log('❌ [MaterialMessage] Closing preview modal');
            setIsViewerOpen(false);
          }}
        />
      )}
      {/* Course Selector Modal */}
      <CourseSelector
        isOpen={showCourseSelector}
        onClose={() => setShowCourseSelector(false)}
        onSelectCourse={handleAddToCourse}
        materialName={materialPreview.name}
        materialFilename={materialPreview.original_filename}
      />
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
        type={confirmationModal.type}
        title={confirmationModal.title}
        message={confirmationModal.message}
      />
    </>
  );
};

export default MaterialMessage;
