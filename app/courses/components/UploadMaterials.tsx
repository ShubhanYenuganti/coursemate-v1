import React, { useRef, useState } from "react";

interface UploadFile {
  id: string;
  name: string;
  type: string;
  size: string;
  url: string;
  versionHistory: { date: string; url: string }[];
}

const UploadMaterials: React.FC = () => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [link, setLink] = useState("");
  const dropRef = useRef<HTMLDivElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    const newFiles = droppedFiles.map(file => ({
      id: Date.now().toString() + Math.random(),
      name: file.name,
      type: file.type || "unknown",
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      url: URL.createObjectURL(file),
      versionHistory: [{ date: new Date().toISOString().split('T')[0], url: URL.createObjectURL(file) }],
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleAddLink = () => {
    if (link.trim()) {
      setFiles(prev => [
        ...prev,
        {
          id: Date.now().toString() + Math.random(),
          name: link,
          type: link.includes("youtube") ? "YouTube" : link.includes("docs.google") ? "Google Doc" : "Link",
          size: "-",
          url: link,
          versionHistory: [{ date: new Date().toISOString().split('T')[0], url: link }],
        },
      ]);
      setLink("");
    }
  };

  return (
    <div className="my-8">
      <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">Upload Materials</h3>
      <div
        ref={dropRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-blue-400 rounded-lg p-8 text-center mb-4 bg-blue-50 hover:bg-blue-100 cursor-pointer"
      >
        <p className="text-blue-700 font-semibold">Drag and drop files here to upload</p>
        <p className="text-gray-500 text-sm">Bulk upload supported</p>
      </div>
      <div className="flex gap-2 mb-4">
        <input
          className="border rounded p-2 flex-1"
          placeholder="Paste file link (YouTube, Google Docs, etc.)"
          value={link}
          onChange={e => setLink(e.target.value)}
        />
        <button onClick={handleAddLink} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold">Add Link</button>
      </div>
      <div className="space-y-4">
        {files.map(file => (
          <div key={file.id} className="bg-gray-50 border border-gray-200 rounded-lg shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="font-semibold text-blue-700 truncate">{file.name}</div>
              <div className="text-xs text-gray-400 mb-1">{file.type} {file.size && `(${file.size})`}</div>
              <div className="text-xs text-gray-500 mb-1">Version history:</div>
              <ul className="list-disc pl-6 text-xs text-gray-500">
                {file.versionHistory.map((v, idx) => (
                  <li key={idx}><a href={v.url} target="_blank" rel="noopener noreferrer" className="underline">{v.date}</a></li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">Open</a>
              {/* Add replace/delete actions here if needed */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UploadMaterials; 