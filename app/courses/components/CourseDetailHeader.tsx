import React from "react";

const CourseDetailHeader = ({ courseId }: { courseId: string }) => {
  // TODO: Replace with real data fetch
  const course = {
    name: "Advanced React Development",
    subject: "Computer Science",
    semester: "Fall 2024",
    professor: "Prof. Jane Doe",
    units: 4,
    code: "CS61A",
    tags: ["AI", "Project", "Lab-heavy"],
  };
  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{course.name} <span className="ml-2 text-sm text-gray-500 font-normal">({course.code})</span></h1>
        <div className="flex flex-wrap gap-3 items-center text-sm text-gray-600 mb-2">
          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{course.subject}</span>
          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">{course.semester}</span>
          <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full">{course.professor}</span>
          <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">{course.units} units</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-1">
          {course.tags.map(tag => (
            <span key={tag} className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full cursor-pointer hover:bg-indigo-200 transition-colors text-xs">{tag}</span>
          ))}
        </div>
      </div>
      {/* TODO: Add edit button if user is creator */}
    </div>
  );
};

export default CourseDetailHeader; 