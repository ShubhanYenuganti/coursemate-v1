import React from "react";
import CourseDetailHeader from "../components/CourseDetailHeader";

const CourseDetailPage = ({ params }: { params: { courseId: string } }) => {
  // TODO: Fetch course data by params.courseId
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8 relative">
      <div className="max-w-5xl mx-auto">
        <CourseDetailHeader courseId={params.courseId} />
        {/* TODO: Add Course Banner, Description, Materials, Outline, AI Chat, Notes, etc. */}
        <div className="mt-8 text-center text-gray-400">[Course detail sections coming soon]</div>
      </div>
    </div>
  );
};

export default CourseDetailPage; 