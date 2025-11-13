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
    <div className="bg-white/40 backdrop-blur-md rounded-xl shadow-sm border border-blue-100/50 p-4 mb-6">
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Glassmorphism Search Bar */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-blue-200/50 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white/60 backdrop-blur-lg text-sm placeholder-gray-400 transition-all duration-200 hover:bg-white/80"
          />
        </div>
        
        {/* Compact Filters */}
        <div className="flex gap-2 flex-wrap">
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="px-3 py-2 border border-blue-200/50 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white/60 backdrop-blur-lg text-sm font-medium hover:bg-white/80 transition-all duration-200"
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
            className="px-3 py-2 border border-blue-200/50 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white/60 backdrop-blur-lg text-sm font-medium hover:bg-white/80 transition-all duration-200"
          >
            <option value="lastAccessed">Recently Accessed</option>
            <option value="title">Alphabetical</option>
            <option value="progress">Progress Level</option>
          </select>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-2 border border-blue-200/50 rounded-lg hover:bg-white/80 bg-white/60 backdrop-blur-lg flex items-center gap-2 text-sm font-medium transition-all duration-200 hover:border-blue-300"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          
          {/* Compact View Toggle */}
          <div className="flex rounded-lg border border-blue-200/50 bg-white/60 backdrop-blur-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 ${viewMode === 'grid' 
                ? 'bg-blue-500 text-white shadow-sm' 
                : 'text-gray-600 hover:bg-white/80'
              } transition-all duration-200`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 ${viewMode === 'list' 
                ? 'bg-blue-500 text-white shadow-sm' 
                : 'text-gray-600 hover:bg-white/80'
              } transition-all duration-200`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Filter Chips */}
      {filterChips.length > 0 && (
        <div className="flex gap-2 flex-wrap mt-3">
          {filterChips.map(chip => (
            <div key={chip.id} className="bg-blue-50/80 backdrop-blur-sm text-blue-700 px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-blue-200/50 hover:bg-blue-100/80 transition-colors">
              {chip.label}
              <button onClick={() => onRemoveFilterChip(chip.id)} className="hover:bg-blue-200/50 rounded-full p-0.5 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Advanced Filters */}
      {showFilters && (
        <div className="mt-3 p-4 bg-blue-50/50 backdrop-blur-sm rounded-lg border border-blue-100/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject Area</label>
              <select
                onChange={(e) => e.target.value !== 'all' && onAddFilterChip('Subject', e.target.value)}
                className="w-full px-3 py-2 border border-blue-200/50 rounded-lg bg-white/80 backdrop-blur-sm text-sm"
              >
                {subjects.map(subject => (
                  <option key={subject} value={subject}>
                    {subject === 'all' ? 'All Subjects' : subject}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Progress Level</label>
              <select
                onChange={(e) => e.target.value !== 'all' && onAddFilterChip('Progress', e.target.value)}
                className="w-full px-3 py-2 border border-blue-200/50 rounded-lg bg-white/80 backdrop-blur-sm text-sm"
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
                className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all duration-200 ${
                  showArchived 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'bg-white/80 text-gray-700 border border-blue-200/50 hover:bg-white'
                }`}
              >
                {showArchived ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
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