import React from 'react';

const CourseHeader: React.FC = () => {
  return (
    <div className="mb-8 text-center">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent mb-3">
        My Courses
      </h1>
      <p className="text-base text-gray-600 font-light max-w-3xl mx-auto">
        Discover, learn, and master new skills with our curated collection of courses
      </p>
    </div>
  );
};

export default CourseHeader; 