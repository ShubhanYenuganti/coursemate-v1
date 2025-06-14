import React from 'react';
import { 
  Search, 
  Filter, 
  Grid, 
  List, 
  Eye, 
  EyeOff, 
  X 
} from 'lucide-react';

interface FilterChip {
  id: string;
  type: string;
  value: string;
  label: string;
}

interface CourseFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedSemester: string;
  setSelectedSemester: (semester: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  viewMode: string;
  setViewMode: (mode: string) => void;
  showArchived: boolean;
  setShowArchived: (show: boolean) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  filterChips: FilterChip[];
  onAddFilterChip: (type: string, value: string) => void;
  onRemoveFilterChip: (chipId: string) => void;
}

const CourseFilters: React.FC<CourseFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  selectedSemester,
  setSelectedSemester,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  showArchived,
  setShowArchived,
  showFilters,
  setShowFilters,
  filterChips,
  onAddFilterChip,
  onRemoveFilterChip
}) => {
  const semesters = ['all', 'Fall 2024', 'Summer 2024', 'Spring 2024', 'Fall 2023'];
  const subjects = ['all', 'Programming', 'Science', 'Mathematics', 'History', 'Art', 'Music'];

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8 mb-8">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Enhanced Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search your courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/80 backdrop-blur-sm text-lg placeholder-gray-400"
          />
        </div>
        
        {/* Refined Filters */}
        <div className="flex gap-4 flex-wrap">
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="px-6 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/80 backdrop-blur-sm text-base font-medium"
          >
            {semesters.map(semester => (
              <option key={semester} value={semester}>
                {semester === 'all' ? 'All Semesters' : semester}
              </option>
            ))}
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-6 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/80 backdrop-blur-sm text-base font-medium"
          >
            <option value="lastAccessed">Recently Accessed</option>
            <option value="title">Alphabetical</option>
            <option value="progress">Progress Level</option>
          </select>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-6 py-4 border border-gray-200 rounded-xl hover:bg-white/80 backdrop-blur-sm flex items-center gap-3 text-base font-medium transition-all duration-200"
          >
            <Filter className="w-5 h-5" />
            Advanced Filters
          </button>
          
          {/* Enhanced View Toggle */}
          <div className="flex rounded-xl border border-gray-200 bg-white/60 backdrop-blur-sm overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-6 py-4 ${viewMode === 'grid' 
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
                : 'text-gray-600 hover:bg-white/80'
              } transition-all duration-200 font-medium`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-6 py-4 ${viewMode === 'list' 
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
                : 'text-gray-600 hover:bg-white/80'
              } transition-all duration-200 font-medium`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Enhanced Filter Chips */}
      {filterChips.length > 0 && (
        <div className="flex gap-3 flex-wrap mt-6">
          {filterChips.map(chip => (
            <div key={chip.id} className="bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 border border-indigo-200">
              {chip.label}
              <button onClick={() => onRemoveFilterChip(chip.id)} className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Enhanced Advanced Filters */}
      {showFilters && (
        <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-3">Subject Area</label>
              <select
                onChange={(e) => e.target.value !== 'all' && onAddFilterChip('Subject', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-base"
              >
                {subjects.map(subject => (
                  <option key={subject} value={subject}>
                    {subject === 'all' ? 'All Subjects' : subject}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-3">Progress Level</label>
              <select
                onChange={(e) => e.target.value !== 'all' && onAddFilterChip('Progress', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-base"
              >
                <option value="all">All Progress Levels</option>
                <option value="100% Complete">Completed Courses</option>
                <option value="80%+ Complete">Nearly Complete</option>
                <option value="In Progress">Currently Learning</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`px-6 py-3 rounded-xl flex items-center gap-3 text-base font-semibold transition-all duration-200 ${
                  showArchived 
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {showArchived ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                {showArchived ? 'Hide Archived' : 'Show Archived'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseFilters; 