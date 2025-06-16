import React from "react";
import { Course } from "./CourseCard";

const defaultBanner =
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80";

const CourseDetailHeader = ({ course }: { course: Course }) => (
  <div className="bg-white rounded-xl shadow-md p-8 mb-8">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{course.title}</h1>
        <div className="text-lg text-gray-600 mb-3">
          {course.subject} · {course.semester} · {course.badge} · {course.id}
        </div>
      </div>
      {/* Optionally show Edit button if user is creator */}
    </div>
    <div className="flex flex-wrap gap-3 mb-6">
      <span className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg font-medium text-base">
        {course.subject}
      </span>
      <span className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg font-medium text-base">
        {course.semester}
      </span>
    </div>
    <div className="mb-8">
      <img
        src={defaultBanner}
        alt="Course banner"
        className="w-full h-48 object-cover rounded-xl bg-gray-100"
      />
    </div>
    <div>
      <h2 className="text-2xl font-bold mb-2">Course Description</h2>
      <p className="text-lg text-gray-800">{course.description}</p>
    </div>
  </div>
);

export default CourseDetailHeader; 