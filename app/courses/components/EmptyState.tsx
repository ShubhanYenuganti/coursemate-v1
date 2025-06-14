import React from 'react';
import { BookOpen } from 'lucide-react';

interface EmptyStateProps {
  onClearFilters: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onClearFilters }) => {
  return (
    <div className="text-center py-20">
      <div className="bg-gradient-to-br from-gray-100 to-blue-100 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-8">
        <BookOpen className="w-16 h-16 text-gray-400" />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-4">No courses found</h3>
      <p className="text-gray-600 mb-8 text-lg">Try adjusting your search criteria or explore new learning opportunities</p>
      <button 
        onClick={onClearFilters}
        className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 text-lg font-semibold shadow-lg"
      >
        Clear All Filters
      </button>
    </div>
  );
};

export default EmptyState; 