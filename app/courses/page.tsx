"use client";
import React, { useState, useMemo } from "react";
import { Plus, Code, Beaker, Calculator, Globe, Palette, Music } from 'lucide-react';
import CourseHeader from "./components/CourseHeader";
import CourseFilters from "./components/CourseFilters";
import CourseCard from "./components/CourseCard";
import CourseListItem from "./components/CourseListItem";
import EmptyState from "./components/EmptyState";
import { Course } from "./components/CourseCard";

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

  // Sample course data
  const [courses, setCourses] = useState<Course[]>([
    {
      id: 1,
      title: "Advanced React Development",
      subject: "Programming",
      semester: "Fall 2024",
      progress: 75,
      dailyProgress: 80,
      lastAccessed: "2024-06-13",
      badge: "Creator",
      isPinned: true,
      isArchived: false,
      description: "Deep dive into React hooks, context, and performance optimization",
      icon: Code
    },
    {
      id: 2,
      title: "Organic Chemistry Fundamentals",
      subject: "Science",
      semester: "Fall 2024", 
      progress: 45,
      dailyProgress: 60,
      lastAccessed: "2024-06-12",
      badge: "Enrolled",
      isPinned: false,
      isArchived: false,
      description: "Introduction to organic molecular structures and reactions",
      icon: Beaker
    },
    {
      id: 3,
      title: "Calculus III - Multivariable",
      subject: "Mathematics",
      semester: "Spring 2024",
      progress: 100,
      dailyProgress: 100,
      lastAccessed: "2024-05-15",
      badge: "Enrolled",
      isPinned: false,
      isArchived: false,
      description: "Vector calculus, partial derivatives, and multiple integrals",
      icon: Calculator
    },
    {
      id: 4,
      title: "World History: Ancient Civilizations",
      subject: "History",
      semester: "Fall 2023",
      progress: 90,
      dailyProgress: 0,
      lastAccessed: "2024-01-20",
      badge: "Creator",
      isPinned: false,
      isArchived: true,
      description: "Comprehensive study of ancient civilizations and their impact",
      icon: Globe
    },
    {
      id: 5,
      title: "Digital Art and Design",
      subject: "Art",
      semester: "Fall 2024",
      progress: 30,
      dailyProgress: 90,
      lastAccessed: "2024-06-13",
      badge: "Enrolled",
      isPinned: true,
      isArchived: false,
      description: "Modern digital art techniques and design principles",
      icon: Palette
    },
    {
      id: 6,
      title: "Music Theory Basics",
      subject: "Music",
      semester: "Summer 2024",
      progress: 60,
      dailyProgress: 40,
      lastAccessed: "2024-06-10",
      badge: "Enrolled",
      isPinned: false,
      isArchived: false,
      description: "Fundamentals of music theory, scales, and harmony",
      icon: Music
    }
  ]);

  const togglePin = (courseId: number) => {
    setCourses(prev => prev.map(course => 
      course.id === courseId ? { ...course, isPinned: !course.isPinned } : course
    ));
  };

  const toggleArchive = (courseId: number) => {
    setCourses(prev => prev.map(course => 
      course.id === courseId ? { ...course, isArchived: !course.isArchived } : course
    ));
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
          if (chip.value === '100% Complete') return course.progress === 100;
          if (chip.value === '80%+ Complete') return course.progress >= 80;
          if (chip.value === 'In Progress') return course.progress > 0 && course.progress < 100;
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
          return b.progress - a.progress;
        case 'lastAccessed':
          return new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime();
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
        
        {/* Course Grid/List */}
        <div className="mb-6">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCourses.map(course => (
                <CourseCard 
                  key={course.id} 
                  course={course} 
                  onTogglePin={togglePin}
                  onToggleArchive={toggleArchive}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCourses.map(course => (
                <CourseListItem 
                  key={course.id} 
                  course={course} 
                  onTogglePin={togglePin}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Empty State */}
        {filteredCourses.length === 0 && (
          <EmptyState onClearFilters={clearAllFilters} />
        )}
      </div>
      
      {/* Floating Add Button - Positioned relative to the page container */}
      <button className="absolute bottom-8 right-8 z-50 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-2xl shadow-2xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 hover:scale-110 hover:shadow-3xl transform group animate-pulse hover:animate-none">
        <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
      </button>
    </div>
  );
};

export default CoursesPage; 