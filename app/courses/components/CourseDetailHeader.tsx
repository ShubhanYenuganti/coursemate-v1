import React, { useState } from "react";
import { Course } from "./CourseCard";
import { courseService } from "../../../lib/api/courseService";

const defaultBanner =
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80";

const CourseDetailHeader = ({ course, onDescriptionUpdated }: { course: Course; onDescriptionUpdated: (d: string)=>void }) => {
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(course.description);
  const [saving, setSaving] = useState(false);

  const saveDesc = async () => {
    try {
      setSaving(true);
      await courseService.updateCourse(course.dbId, { description: desc });
      setEditing(false);
      onDescriptionUpdated(desc);
    } catch(e){
      console.error('Failed to update description', e);
    } finally { setSaving(false);}  
  };

  return (
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
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-4">
          Course Description
          {course.badge === 'Creator' && !editing && (
            <button onClick={() => setEditing(true)} className="text-sm text-blue-600 underline">Edit</button>
          )}
        </h2>
        {editing ? (
          <div className="space-y-3">
            <textarea value={desc} onChange={e=>setDesc(e.target.value)} className="w-full border rounded-lg p-2" rows={4}/>
            <div className="flex gap-3">
              <button onClick={saveDesc} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                {saving? 'Saving...' : 'Save'}
              </button>
              <button onClick={()=>{setEditing(false); setDesc(course.description);}} className="px-4 py-2 bg-gray-100 rounded-lg">Cancel</button>
            </div>
          </div>
        ): (
          <p className="text-lg text-gray-800 whitespace-pre-line">{course.description}</p>
        )}
      </div>
    </div>
  );
};

export default CourseDetailHeader; 