"use client";

import React, { useState, useEffect } from 'react';
import { X, BookOpen, Plus } from 'lucide-react';

interface Course {
  id: string;
  combo_id: string;
  title: string;
  subject?: string;
  semester?: string;
  has_material?: boolean;
}

interface CourseSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCourse: (courseId: string, courseTitle: string) => void;
  materialName: string;
  materialFilename?: string;
}

const CourseSelector: React.FC<CourseSelectorProps> = ({
  isOpen,
  onClose,
  onSelectCourse,
  materialName,
  materialFilename
}) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5173";
      
      // Build URL with material filename parameter if available
      let url = `${api}/api/chat-group/user-courses`;
      if (materialFilename) {
        url += `?material_filename=${encodeURIComponent(materialFilename)}`;
      }
      
      console.log('🔍 [CourseSelector] Fetching user courses from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📊 [CourseSelector] API response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [CourseSelector] Courses fetched:', data);
        
        // Log courses with materials for debugging
        const coursesWithMaterials = data.courses?.filter((c: Course) => c.has_material) || [];
        if (coursesWithMaterials.length > 0) {
          console.log('📚 [CourseSelector] Courses already containing this material:', coursesWithMaterials.map((c: Course) => c.title));
        }
        
        setCourses(data.courses || []);
      } else {
        console.error('❌ [CourseSelector] Failed to fetch courses:', response.statusText);
      }
    } catch (error) {
      console.error('❌ [CourseSelector] Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCourses();
    }
  }, [isOpen]);

  const handleSelectCourse = (courseId: string, courseTitle: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click from triggering
    console.log('📚 [CourseSelector] Course selected:', { courseId, courseTitle });
    onSelectCourse(courseId, courseTitle);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[80vh] max-h-[600px] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Plus className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Add to Course</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Material Preview */}
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Adding: {materialName}</h3>
              <p className="text-sm text-gray-600">Select a course to add this material to</p>
            </div>
          </div>
        </div>

        {/* Courses List - Scrollable */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto p-6" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading your courses...</p>
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No courses found</p>
                <p className="text-sm text-gray-400 mt-1">
                  You need to create a course first to add materials
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {courses.map((course) => {
                  const hasMaterial = course.has_material;
                  const isDisabled = hasMaterial;
                  
                  return (
                    <div
                      key={course.id}
                      className={`border rounded-lg p-4 transition-all ${
                        isDisabled 
                          ? 'border-gray-200 bg-gray-50 opacity-60' 
                          : 'border-gray-200 hover:border-blue-300 hover:shadow-sm hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 bg-gradient-to-br rounded-lg flex items-center justify-center text-white font-semibold text-sm ${
                            isDisabled 
                              ? 'from-gray-400 to-gray-500' 
                              : 'from-blue-500 to-purple-600'
                          }`}>
                            {course.subject || course.title.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className={`font-medium ${isDisabled ? 'text-gray-500' : 'text-gray-900'}`}>
                                {course.title}
                              </h3>
                              {hasMaterial && (
                                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                  Already added
                                </span>
                              )}
                            </div>
                            {course.subject && (
                              <p className={`text-sm ${isDisabled ? 'text-gray-400' : 'text-gray-500'}`}>
                                {course.subject}
                              </p>
                            )}
                            {course.semester && (
                              <p className={`text-xs ${isDisabled ? 'text-gray-400' : 'text-gray-400'}`}>
                                Semester: {course.semester}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => !isDisabled && handleSelectCourse(course.id, course.title, e)}
                          disabled={isDisabled}
                          className={`p-2 rounded-lg transition-colors ${
                            isDisabled
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-blue-600 hover:text-blue-700 hover:bg-blue-100'
                          }`}
                          title={hasMaterial ? 'Material already exists in this course' : `Add to ${course.title}`}
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <p className="text-sm text-gray-600">
            Click the <Plus className="inline w-4 h-4 mx-1" /> button next to a course to add this material. 
            Courses that already have this material are disabled.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CourseSelector;
