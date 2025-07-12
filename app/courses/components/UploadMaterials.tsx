import React, { useRef, useState } from "react";

export interface UploadMaterialsProps {
  courseId: string;
  onUploadComplete?: () => void;
}

interface UploadedFile {
  name: string;
  url: string;
  type: string;
  vector_processed?: boolean;
  chunks_processed?: number;
  warning?: string;
}

const UploadMaterials: React.FC<UploadMaterialsProps> = ({ courseId, onUploadComplete }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    await handleFiles(droppedFiles);
  };

  const handleFiles = async (selectedFiles: File[]) => {
    setFiles(prev => [...prev, ...selectedFiles]);
    setUploading(true);
    setUploadError(null);
    try {
      const token = localStorage.getItem('token');
      const newUploaded: UploadedFile[] = [];
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173"}/api/courses/${courseId}/materials/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          newUploaded.push({
            name: file.name,
            url: data.url,
            type: file.type,
            vector_processed: data.vector_processed,
            chunks_processed: data.chunks_processed,
            warning: data.warning,
          });
        } else {
          setUploadError('Failed to upload one or more files.');
        }
      }
      setUploadedFiles(prev => [...prev, ...newUploaded]);
      if (onUploadComplete) onUploadComplete();
    } catch (err) {
      setUploadError('Failed to upload one or more files.');
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  return (
    <div className="my-8">
      <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">Upload Materials</h3>
      <div
        ref={dropRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleClick}
        className="border-2 border-dashed border-blue-400 rounded-lg p-8 text-center mb-4 bg-blue-50 hover:bg-blue-100 cursor-pointer"
        style={{ userSelect: 'none' }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />
        <p className="text-blue-700 font-semibold">Drag and drop files here to upload</p>
        <p className="text-gray-500 text-sm">Bulk upload supported, or click to select files</p>
        {uploading && <div className="text-blue-600 mt-2">Uploading...</div>}
        {uploadError && <div className="text-red-600 mt-2">{uploadError}</div>}
      </div>
      {/* Preview of uploaded files */}
      {uploadedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="font-semibold mb-2">Uploaded Files:</h4>
          {uploadedFiles.map((file, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-gray-50 border rounded p-2">
              {file.type.startsWith('image') ? (
                <img src={file.url} alt={file.name} className="w-16 h-16 object-cover rounded" />
              ) : file.type.startsWith('video') ? (
                <video src={file.url} className="w-16 h-16 object-cover rounded" controls />
              ) : (
                <span className="w-16 h-16 flex items-center justify-center bg-gray-200 rounded text-gray-500">FILE</span>
              )}
              <div className="flex-1">
              <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">{file.name}</a>
                {file.vector_processed && (
                  <div className="text-xs text-green-600 mt-1">
                    ✅ Vector processed ({file.chunks_processed} chunks)
                  </div>
                )}
                {file.warning && (
                  <div className="text-xs text-yellow-600 mt-1">
                    ⚠️ {file.warning}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UploadMaterials; 