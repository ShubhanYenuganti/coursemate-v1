import React from 'react';

const CourseHeader: React.FC = () => {
  return (
    <div className="mb-12 text-center">
      <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent mb-4">
        My Learning Journey
      </h1>
      <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto leading-relaxed">
        Discover, learn, and master new skills with our curated collection of courses
      </p>
    </div>
  );
};

export default CourseHeader; 