"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Plus, Code, Beaker, Calculator, Globe, Palette, Music } from 'lucide-react';
import { courseService, CourseData } from "../../lib/api/courseService";
import CourseHeader from "./components/CourseHeader";
import CourseFilters from "./components/CourseFilters";
import CourseCard from "./components/CourseCard";
import CourseListItem from "./components/CourseListItem";
import EmptyState from "./components/EmptyState";
import { Course } from "./components/CourseCard";
import CreateCourseModal from "./components/CreateCourseModal";

// Helper function to get icon based on subject
const getSubjectIcon = (subject: string) => {
  const iconMap: { [key: string]: React.ComponentType<any> } = {
    'Programming': Code,
    'Computer Science': Code,
    'Science': Beaker,
    'Biology': Beaker,
    'Mathematics': Calculator,
    'History': Globe,
    'Art': Palette,
    'Music': Music,
  };
  return iconMap[subject] || Code; // Default to Code icon
};

// Helper function to convert CourseData to Course format
const convertToDisplayFormat = (courseData: CourseData): Course => {
  return {
    id: parseInt(courseData.id || '0'), // Convert string ID to number for component compatibility
    title: courseData.title,
    subject: courseData.subject,
    semester: courseData.semester,
    dailyProgress: courseData.dailyProgress || 0,
    lastAccessed: courseData.lastAccessed || new Date().toISOString().split('T')[0],
    badge: courseData.badge || 'Creator',
    isPinned: courseData.isPinned || false,
    isArchived: courseData.isArchived || false,
    description: courseData.description,
    icon: getSubjectIcon(courseData.subject)
  };
};

interface FilterChip {
  id: string;
  type: string;
  value: string;
  label: string;
}

const CoursesPage = () => {
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('all');
  const [sortBy, setSortBy] = useState('lastAccessed');
  const [showArchived, setShowArchived] = useState(false);
  const [filterChips, setFilterChips] = useState<FilterChip[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Course data from backend
  const [courses, setCourses] = useState<CourseData[]>([]);

  // Load courses from backend
  const loadCourses = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const coursesData = await courseService.getCourses({
        showArchived,
        search: searchTerm,
        semester: selectedSemester,
        sortBy: sortBy as 'title' | 'progress' | 'last_accessed'
      });
      setCourses(coursesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
      console.error('Failed to load courses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load courses on component mount and when filters change
  useEffect(() => {
    loadCourses();
  }, [showArchived, searchTerm, selectedSemester, sortBy]);

  const togglePin = async (courseId: string) => {
    try {
      await courseService.togglePin(courseId);
      setCourses(prev => prev.map(course => 
        course.id === courseId ? { ...course, isPinned: !course.isPinned } : course
      ));
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const toggleArchive = async (courseId: string) => {
    try {
      await courseService.toggleArchive(courseId);
      setCourses(prev => prev.map(course => 
        course.id === courseId ? { ...course, isArchived: !course.isArchived } : course
      ));
    } catch (error) {
      console.error('Failed to toggle archive:', error);
    }
  };

  // Wrapper functions for component compatibility (number ID to string ID)
  const handleTogglePin = (courseId: number) => {
    const course = courses.find(c => parseInt(c.id || '0') === courseId);
    if (course?.id) {
      togglePin(course.id);
    }
  };

  const handleToggleArchive = (courseId: number) => {
    const course = courses.find(c => parseInt(c.id || '0') === courseId);
    if (course?.id) {
      toggleArchive(course.id);
    }
  };

  const addFilterChip = (type: string, value: string) => {
    const chipId = `${type}-${value}`;
    if (!filterChips.find(chip => chip.id === chipId)) {
      setFilterChips(prev => [...prev, { id: chipId, type, value, label: `${type}: ${value}` }]);
    }
  };

  const removeFilterChip = (chipId: string) => {
    setFilterChips(prev => prev.filter(chip => chip.id !== chipId));
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedSemester('all');
    setFilterChips([]);
    setShowArchived(false);
  };

  const filteredCourses = useMemo(() => {
    let filtered = courses.filter(course => {
      if (!showArchived && course.isArchived) return false;
      
      const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           course.subject.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSemester = selectedSemester === 'all' || course.semester === selectedSemester;
      
      const matchesFilters = filterChips.every(chip => {
        if (chip.type === 'Subject') return course.subject === chip.value;
        if (chip.type === 'Progress') {
          const progress = course.dailyProgress || 0;
          if (chip.value === '100% Complete') return progress === 100;
          if (chip.value === '80%+ Complete') return progress >= 80;
          if (chip.value === 'In Progress') return progress > 0 && progress < 100;
        }
        return true;
      });
      
      return matchesSearch && matchesSemester && matchesFilters;
    });

    // Sort courses
    filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'progress':
          return (b.dailyProgress || 0) - (a.dailyProgress || 0);
        case 'lastAccessed':
          const aDate = a.lastAccessed ? new Date(a.lastAccessed).getTime() : 0;
          const bDate = b.lastAccessed ? new Date(b.lastAccessed).getTime() : 0;
          return bDate - aDate;
        default:
          return 0;
      }
    });

    return filtered;
  }, [courses, searchTerm, selectedSemester, filterChips, showArchived, sortBy]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8 relative">
      <div className="max-w-7xl mx-auto">
        <CourseHeader />
        
        <CourseFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedSemester={selectedSemester}
          setSelectedSemester={setSelectedSemester}
          sortBy={sortBy}
          setSortBy={setSortBy}
          viewMode={viewMode}
          setViewMode={setViewMode}
          showArchived={showArchived}
          setShowArchived={setShowArchived}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          filterChips={filterChips}
          onAddFilterChip={addFilterChip}
          onRemoveFilterChip={removeFilterChip}
        />
        
        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600">Loading courses...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
            <p>Error: {error}</p>
            <button 
              onClick={() => loadCourses()} 
              className="mt-2 text-sm underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Course Grid/List */}
        {!isLoading && !error && (
          <div className="mb-6">
            {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredCourses.map(course => (
                <CourseCard 
                  key={course.id} 
                  course={convertToDisplayFormat(course)} 
                  onTogglePin={handleTogglePin}
                  onToggleArchive={handleToggleArchive}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCourses.map(course => (
                <CourseListItem 
                  key={course.id} 
                  course={convertToDisplayFormat(course)} 
                  onTogglePin={handleTogglePin}
                />
              ))}
            </div>
          )}
          </div>
        )}
        
        {/* Empty State */}
        {!isLoading && !error && filteredCourses.length === 0 && (
          <EmptyState onClearFilters={clearAllFilters} />
        )}
      </div>
      
      {/* Floating Add Button with Speed Dial - DEBUG VERSION */}
      <div className="fixed bottom-8 right-8 z-[9999] flex flex-col items-end group">
        {/* Speed dial options (hidden by default, shown on hover, animate upwards) */}
        <div className="flex flex-col items-end space-y-2 mb-2">
          <button
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium hover:from-indigo-700 hover:to-purple-700 transform transition-all duration-300 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0"
            style={{ transitionDelay: '100ms' }}
            onClick={() => setCreateModalOpen(true)}
          >
            + Add Course
          </button>
          <button
            className="bg-gradient-to-r from-blue-400 to-purple-400 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium hover:from-blue-500 hover:to-purple-500 transform transition-all duration-300 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0"
            style={{ transitionDelay: '200ms' }}
            tabIndex={-1}
          >
            🔍 Discover Course
          </button>
        </div>
        {/* Main Add button - MADE MORE VISIBLE FOR DEBUG */}
        <button
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-2xl shadow-2xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 hover:scale-110 hover:shadow-2xl transform relative border-4 border-yellow-400"
          onClick={() => setCreateModalOpen(true)}
          style={{ minWidth: '80px', minHeight: '80px' }}
        >
          <Plus className="w-8 h-8 transition-transform duration-300" />
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-2xl opacity-0 hover:opacity-20 transition-opacity duration-300"></div>
        </button>
      </div>
      {isCreateModalOpen && (
        <CreateCourseModal 
          onClose={() => setCreateModalOpen(false)} 
          onCourseCreated={loadCourses}
        />
      )}
    </div>
  );
};

export default CoursesPage; 