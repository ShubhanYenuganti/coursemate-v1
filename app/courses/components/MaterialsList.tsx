import React, { useState, useEffect } from "react";

interface Material {
  id: string;
  name: string;
  type: string;
  size: string;
  url: string;
  date: string;
  tags: string[];
  originalName: string;
  pinned?: boolean;
}

export interface MaterialsListProps {
  courseId: string;
  refreshTrigger?: any;
  onFileDeleted?: () => void;
}

const PAGE_SIZE = 6;

const MaterialsList: React.FC<MaterialsListProps> = ({ courseId, refreshTrigger, onFileDeleted }) => {
  const [search, setSearch] = useState("");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [page, setPage] = useState(1);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchMaterials = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/courses/${courseId}/materials`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const files = await res.json();
      // Map S3 files to Material type
      setMaterials(files.map((f: any) => ({
        id: f.key,
        name: f.key.split("/").pop() || f.key,
        type: f.key.split('.').pop() || '',
        size: `${(f.size / 1024).toFixed(1)} KB`,
        url: f.url,
        date: f.last_modified ? new Date(f.last_modified).toLocaleDateString() : '',
        tags: [],
        originalName: f.key.split("/").pop() || f.key,
      })));
    } catch (e) {
      setMaterials([]);
    }
  };

  useEffect(() => {
    fetchMaterials();
    // eslint-disable-next-line
  }, [courseId, refreshTrigger]);

  const filteredMaterials = materials
    .filter(m =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.type.toLowerCase().includes(search.toLowerCase()) ||
      m.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)); // pinned first

  const totalPages = Math.ceil(filteredMaterials.length / PAGE_SIZE);
  const paginatedMaterials = filteredMaterials.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = async (id: string) => {
    const token = localStorage.getItem('token');
    await fetch(`/api/courses/${courseId}/materials/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (onFileDeleted) onFileDeleted();
    fetchMaterials();
  };

  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };

  const handlePin = (id: string) => {
    setMaterials(materials => materials.map(m => m.id === id ? { ...m, pinned: !m.pinned } : m));
  };

  // Improved file type detection
  const isImage = (url: string) => /\.png|\.jpe?g|\.gif|\.bmp|\.webp/i.test(url);
  const isPDF = (url: string) => url.toLowerCase().includes('.pdf');

  const PreviewModal: React.FC<{ url: string | null; onClose: () => void }> = ({ url, onClose }) => {
    if (!url) return null;
    return (
      <div className="preview-modal-overlay" onClick={onClose}>
        <div className="preview-modal-content" onClick={e => e.stopPropagation()}>
          <button className="close-btn" onClick={onClose}>✖️</button>
          {isImage(url) ? (
            <img src={url} alt="Preview" style={{ maxWidth: '100%', maxHeight: '80vh' }} />
          ) : isPDF(url) ? (
            <iframe src={url} style={{ width: '80vw', height: '80vh' }} title="PDF Preview" />
          ) : (
            <div>
              <p>Preview not available for this file type.</p>
              <a href={url} target="_blank" rel="noopener noreferrer">Open in new tab</a>
            </div>
          )}
        </div>
        <style jsx>{`
          .preview-modal-overlay {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
            z-index: 1000;
          }
          .preview-modal-content {
            background: #fff; padding: 1.5rem; border-radius: 8px; position: relative;
          }
          .close-btn {
            position: absolute; top: 8px; right: 8px; background: none; border: none; font-size: 1.5rem;
          }
        `}</style>
      </div>
    );
  };

  return (
    <>
      <div className="my-8">
        <div className="flex items-center gap-4 mb-4">
          <h3 className="text-2xl font-bold">Uploaded Content</h3>
          <div className="flex-1 flex justify-end">
            <input
              className="border rounded p-2 max-w-xs"
              placeholder="Search files..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-8">
          {paginatedMaterials.map(material => (
            <div
              key={material.id}
              className="relative bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden group flex flex-col cursor-pointer transition-all hover:shadow-lg"
              style={{ minWidth: 220, maxWidth: 320 }}
            >
              <div className="relative w-full aspect-[4/3] bg-gray-100 flex items-center justify-center">
                {/* Preview */}
                {["png", "jpg", "jpeg", "gif", "bmp", "webp"].includes(material.type.toLowerCase()) ? (
                  <img src={material.url} alt={material.name} className="object-cover w-full h-full" style={{ aspectRatio: '4/3' }} />
                ) : material.type === "video" ? (
                  <video src={material.url} className="object-cover w-full h-full" style={{ aspectRatio: '4/3' }} />
                ) : material.type === "pdf" ? (
                  <div className="flex flex-col items-center justify-center w-full h-full text-gray-400">
                    <svg width="48" height="48" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.828A2 2 0 0 0 19.414 7.414l-4.828-4.828A2 2 0 0 0 12.172 2H6zm6 1.414L18.586 10H14a2 2 0 0 1-2-2V3.414z"/><text x="6" y="38" fontSize="10" fill="currentColor">PDF</text></svg>
                    <span className="text-xs mt-2">PDF Preview</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-full text-gray-400">
                    <svg width="48" height="48" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><text x="6" y="38" fontSize="10" fill="currentColor">FILE</text></svg>
                    <span className="text-xs mt-2">File</span>
                  </div>
                )}
                {/* Preview Button Overlay - Top Left */}
                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button
                    onClick={e => { e.stopPropagation(); setPreviewUrl(material.url); }}
                    className="bg-white rounded-full shadow p-2 hover:bg-blue-50 border border-gray-200 flex items-center justify-center"
                    title="Preview"
                  >
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="#222" strokeWidth="2" />
                      <circle cx="12" cy="12" r="4" stroke="#222" strokeWidth="2" />
                      <path d="M2 12C4 7 8 4 12 4s8 3 10 8-4 8-10 8-8-3-10-8z" stroke="#222" strokeWidth="2" />
                    </svg>
                  </button>
                </div>
                {/* Download & Delete Buttons Overlay - Top Right */}
                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {/* Download Button */}
                  <button
                    onClick={e => { e.stopPropagation(); handleDownload(material.url); }}
                    className="bg-white rounded-full shadow p-2 hover:bg-blue-50 border border-gray-200 flex items-center justify-center"
                    title="Download"
                  >
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M12 4v12m0 0l-4-4m4 4l4-4" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 20H4" stroke="#222" strokeWidth="2" strokeLinecap="round"/></svg>
                  </button>
                  {/* Delete Button */}
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(material.id); }}
                    className="bg-white rounded-full shadow p-2 hover:bg-red-50 border border-gray-200 flex items-center justify-center"
                    title="Delete"
                  >
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" fill="#f87171"/><path d="M9 9v6m6-6v6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
                  </button>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-end">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-lg text-gray-900 truncate">{material.name}</div>
                  <button
                    onClick={e => { e.stopPropagation(); handlePin(material.id); }}
                    className="ml-2 focus:outline-none"
                    title={material.pinned ? "Unpin" : "Pin"}
                    style={{ background: 'none', border: 'none', boxShadow: 'none' }}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill={material.pinned ? '#fbbf24' : '#b0b0b0'}
                      xmlns="http://www.w3.org/2000/svg"
                      style={{ transform: 'rotate(180deg)' }}
                    >
                      <path d="M16.5 9.5L14.5 11.5V19C14.5 19.2761 14.2761 19.5 14 19.5H10C9.72386 19.5 9.5 19.2761 9.5 19V11.5L7.5 9.5C7.22386 9.22386 7.5 8.5 8 8.5H16C16.5 8.5 16.7761 9.22386 16.5 9.5Z"/>
                      <rect x="11" y="3" width="2" height="7" rx="1" fill={material.pinned ? '#fbbf24' : '#b0b0b0'} />
                    </svg>
                  </button>
                </div>
                <div className="text-gray-500 text-sm truncate">{material.originalName}</div>
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>{material.date}</span>
                  <span>{material.size}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8 gap-2">
            <button
              className="px-3 py-1 rounded border text-gray-600 disabled:opacity-50"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={`px-3 py-1 rounded border ${page === i + 1 ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="px-3 py-1 rounded border text-gray-600 disabled:opacity-50"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
      {/* Preview Modal */}
      <PreviewModal
        url={previewUrl}
        onClose={() => setPreviewUrl(null)}
      />
    </>
  );
};

export default MaterialsList; 