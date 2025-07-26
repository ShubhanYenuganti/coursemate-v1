"use client";
import React, { useState, useEffect } from "react";
import { Portal } from '../../../components/Portal';
import dynamic from 'next/dynamic';

// Dynamically import the AnnotatablePDFViewer to avoid SSR issues with PDF.js
const AnnotatablePDFViewer = dynamic(
  () => import('@/components/courses/AnnotatablePDFViewer'),
  { ssr: false, loading: () => <div className="flex items-center justify-center p-8">Loading PDF viewer...</div> }
);

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
  thumbnail?: string;
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
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [newFilename, setNewFilename] = useState<string>("");
  const [originalFilename, setOriginalFilename] = useState<string>("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Extract just the course_id part if combo_id is provided (e.g., 'courseid+somethingelse')
  const getS3CourseId = (id: string) => id.split('+')[0];

  const fetchMaterials = async () => {
    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      // Use only the course_id part for S3 lookup
      const s3CourseId = getS3CourseId(courseId);
      const res = await fetch(`${api}/api/courses/${s3CourseId}/materials/db`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const files = await res.json();
      // Map DB materials to Material type
      setMaterials(files.map((f: any) => ({
        id: f.id,
        name: f.material_name,
        type: f.file_type,
        size: f.file_size ? `${(f.file_size / 1024).toFixed(1)} KB` : '',
        url: f.url || (f.file_path.startsWith('http') ? f.file_path : `${api}/${f.file_path}`),
        date: f.created_at ? new Date(f.created_at).toLocaleDateString() : '',
        tags: [],
        originalName: f.original_filename || f.material_name,
        pinned: f.is_pinned,
        thumbnail: f.thumbnail_url, // Use thumbnail_url which has the presigned URL
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
    const material = materials.find(m => m.id === id);
    const materialName = material?.name || 'this material';
    
    if (!confirm(`Are you sure you want to delete "${materialName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${api}/api/courses/${courseId}/materials/db/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Delete failed with status: ${response.status}`);
      }

      // Success - refresh the materials list
      if (onFileDeleted) onFileDeleted();
      fetchMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
      // You could add a toast notification here
      alert(`Failed to delete material: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };

  const handlePin = async (id: string) => {
    const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
    const token = localStorage.getItem('token');
    const materialIndex = materials.findIndex(m => m.id === id);
    if (materialIndex === -1) return;

    // Optimistically update the UI
    const updatedMaterials = [...materials];
    updatedMaterials[materialIndex].pinned = !updatedMaterials[materialIndex].pinned;
    setMaterials(updatedMaterials);

    try {
      await fetch(`${api}/api/courses/${courseId}/materials/db/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_pinned: updatedMaterials[materialIndex].pinned })
      });
    } catch (error) {
      console.error('Error pinning/unpinning material:', error);
      // Revert the UI update if the request fails
      updatedMaterials[materialIndex].pinned = !updatedMaterials[materialIndex].pinned;
      setMaterials(updatedMaterials);
    }
  };

  // Improved file type detection
  const isImage = (url: string) => /\.png|\.jpe?g|\.gif|\.bmp|\.webp/i.test(url);
  const isPDF = (url: string) => url.toLowerCase().includes('.pdf');

  const PreviewModal: React.FC<{ url: string | null; onClose: () => void }> = ({ url, onClose }) => {
    if (!url) return null;
    return (
      <Portal>
        <div 
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-[9999]"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={onClose}
        >
          <div 
            className="bg-white rounded-lg shadow-xl relative overflow-hidden"
            style={{ 
              width: isPDF(url) ? '95vw' : 'auto',
              height: isPDF(url) ? '90vh' : 'auto',
              maxWidth: isPDF(url) ? '1600px' : '90vw',
              maxHeight: '90vh'
            }}
            onClick={e => e.stopPropagation()}
          >
            <button 
              className="absolute top-4 right-4 bg-white/80 hover:bg-white rounded-full p-2 text-gray-700 hover:text-gray-900 z-10"
              onClick={onClose}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div className="flex-1 overflow-auto h-full">
              {isImage(url) ? (
                <img src={url} alt="Preview" className="max-w-full max-h-[85vh] object-contain" />
              ) : isPDF(url) ? (
                <div className="w-full h-full" style={{ minHeight: '800px' }}>
                  <AnnotatablePDFViewer url={url} />
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-lg mb-4">Preview not available for this file type.</p>
                  <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Open in new tab
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </Portal>
    );
  };

  const handleEditFilename = (id: string, currentName: string) => {
    setEditingMaterialId(id);
    setNewFilename(currentName);
    setOriginalFilename(currentName);
  };

  const confirmEditFilename = async () => {
    if (newFilename === originalFilename) {
      setEditingMaterialId(null);
      return;
    }

    const api = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5173";
    const token = localStorage.getItem("token");
    const materialIndex = materials.findIndex((m) => m.id === editingMaterialId);
    if (materialIndex === -1) return;

    // Optimistically update the UI
    const updatedMaterials = [...materials];
    updatedMaterials[materialIndex].name = newFilename;
    setMaterials(updatedMaterials);

    try {
      await fetch(`${api}/api/courses/${courseId}/materials/db/${editingMaterialId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ material_name: newFilename }),
      });
    } catch (error) {
      console.error("Error updating filename:", error);
      // Revert the UI update if the request fails
      updatedMaterials[materialIndex].name = originalFilename;
      setMaterials(updatedMaterials);
    } finally {
      setEditingMaterialId(null);
      setShowConfirmation(false);
    }
  };

  const cancelEditFilename = () => {
    setEditingMaterialId(null);
    setNewFilename(originalFilename);
    setShowConfirmation(false);
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
                {material.thumbnail ? (
                  <img src={material.thumbnail} alt={material.name} className="object-cover w-full h-full" style={{ aspectRatio: '4/3' }} />
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-full text-gray-400">
                    <span className="text-xs mt-2">No Preview Available</span>
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
                  {editingMaterialId === material.id ? (
                    <input
                      type="text"
                      value={newFilename}
                      onChange={(e) => setNewFilename(e.target.value)}
                      onBlur={() => setShowConfirmation(true)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setShowConfirmation(true);
                        if (e.key === "Escape") cancelEditFilename();
                      }}
                      className="border-b border-dotted focus:border-solid focus:outline-none w-full"
                    />
                  ) : (
                    <span
                      onClick={() => handleEditFilename(material.id, material.name)}
                      className="cursor-pointer border-b border-dotted hover:border-solid"
                    >
                      {material.name}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePin(material.id);
                    }}
                    className="ml-2 focus:outline-none"
                    title={material.pinned ? "Unpin" : "Pin"}
                    style={{ background: "none", border: "none", boxShadow: "none" }}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill={material.pinned ? "#fbbf24" : "#b0b0b0"}
                      xmlns="http://www.w3.org/2000/svg"
                      style={{ transform: "rotate(180deg)" }}
                    >
                      <path d="M16.5 9.5L14.5 11.5V19C14.5 19.2761 14.2761 19.5 14 19.5H10C9.72386 19.5 9.5 19.2761 9.5 19V11.5L7.5 9.5C7.22386 9.22386 7.5 8.5 8 8.5H16C16.5 8.5 16.7761 9.22386 16.5 9.5Z"/>
                      <rect x="11" y="3" width="2" height="7" rx="1" fill={material.pinned ? "#fbbf24" : "#b0b0b0"} />
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
      {/* Confirmation Popup */}
      {showConfirmation && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Confirm Filename Change</h3>
              <p className="text-gray-700 mb-6">Are you sure you want to change the filename to "{newFilename}"?</p>
              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={cancelEditFilename}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  onClick={confirmEditFilename}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
};

export default MaterialsList;