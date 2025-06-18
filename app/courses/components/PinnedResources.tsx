import React, { useState } from "react";
import { Course } from "./CourseCard";

interface Resource {
  id: string;
  title: string;
  url: string;
  archived: boolean;
}

const initialResources: Resource[] = [
  { id: "1", title: "Syllabus PDF", url: "https://example.com/syllabus.pdf", archived: false },
  { id: "2", title: "Lecture Slides Week 1", url: "https://example.com/slides1.pdf", archived: false },
];

const PinnedResources: React.FC<{ course: Course }> = ({ course }) => {
  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const isCreator = course.badge === "Creator";

  const addResource = () => {
    if (newTitle.trim() && newUrl.trim()) {
      setResources([
        ...resources,
        { id: Date.now().toString(), title: newTitle.trim(), url: newUrl.trim(), archived: false },
      ]);
      setNewTitle("");
      setNewUrl("");
    }
  };

  const archiveResource = (id: string) => {
    setResources(resources.map(r => r.id === id ? { ...r, archived: true } : r));
  };

  const unarchiveResource = (id: string) => {
    setResources(resources.map(r => r.id === id ? { ...r, archived: false } : r));
  };

  return (
    <div className="my-8">
      <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">Pinned Resources</h3>
      <div className="flex flex-wrap gap-4 mb-4">
        {resources.filter(r => !r.archived).map(resource => (
          <div key={resource.id} className="bg-gray-50 border border-gray-200 rounded-lg shadow-sm p-4 min-w-[220px] max-w-xs flex flex-col justify-between relative">
            <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 font-semibold hover:underline text-lg mb-2 block truncate">{resource.title}</a>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-400 truncate">{resource.url}</span>
              {isCreator && (
                <button onClick={() => archiveResource(resource.id)} className="ml-2 text-xs text-gray-400 hover:text-red-500">Archive</button>
              )}
            </div>
          </div>
        ))}
      </div>
      {isCreator && (
        <div className="mt-4 flex flex-col sm:flex-row gap-2 items-center">
          <input
            className="border rounded p-2 flex-1"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Resource title..."
          />
          <input
            className="border rounded p-2 flex-1"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            placeholder="Resource URL..."
          />
          <button onClick={addResource} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold">Add</button>
        </div>
      )}
      {isCreator && resources.some(r => r.archived) && (
        <div className="mt-6">
          <h4 className="font-semibold text-gray-600 mb-2">Archived Resources</h4>
          <div className="flex flex-wrap gap-4">
            {resources.filter(r => r.archived).map(resource => (
              <div key={resource.id} className="bg-gray-100 border border-gray-200 rounded-lg shadow-sm p-4 min-w-[220px] max-w-xs flex flex-col justify-between relative">
                <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 font-semibold hover:underline text-lg mb-2 block truncate">{resource.title}</a>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-400 truncate">{resource.url}</span>
                  <button onClick={() => unarchiveResource(resource.id)} className="ml-2 text-xs text-blue-500 hover:text-blue-700">Restore</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PinnedResources; 