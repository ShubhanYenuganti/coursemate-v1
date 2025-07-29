"use client";

import React, { useState, useEffect } from 'react';
import { X, File, Paperclip, Search, Eye, Filter } from 'lucide-react';

interface Material {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  thumbnail_path?: string;
  original_filename?: string;
  created_at: string;
  course_name?: string;
}

interface MaterialPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMaterial: (material: Material) => void;
}

const MaterialPicker: React.FC<MaterialPickerProps> = ({
  isOpen,
  onClose,
  onSelectMaterial
}) => {
  const [groupedMaterials, setGroupedMaterials] = useState<{ course_id: string; course_name: string; materials: Material[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFileType, setSelectedFileType] = useState<string>('all');

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Fetch grouped materials by course
      const response = await fetch('/api/materials/all-user-materials', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setGroupedMaterials(data.courses || []);
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMaterials();
    }
  }, [isOpen]);

  // Filtering logic for grouped materials
  const getFilteredGroupedMaterials = () => {
    return groupedMaterials.map(group => {
      let filtered = group.materials;
      if (searchTerm) {
        filtered = filtered.filter(material =>
          material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          material.original_filename?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      if (selectedFileType !== 'all') {
        filtered = filtered.filter(material =>
          material.file_type.toLowerCase().includes(selectedFileType.toLowerCase())
        );
      }
      return { ...group, materials: filtered };
    }).filter(group => group.materials.length > 0);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type.includes('pdf')) return '📄';
    if (type.includes('image')) return '🖼️';
    if (type.includes('video')) return '🎥';
    if (type.includes('audio')) return '🎵';
    if (type.includes('text') || type.includes('doc')) return '📝';
    return '📎';
  };

  const getUniqueFileTypes = () => {
    const types = groupedMaterials.flatMap(group => group.materials.map(m => m.file_type)).filter(Boolean);
    return [...new Set(types)];
  };

  if (!isOpen) return null;

  const filteredGroups = getFilteredGroupedMaterials();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Paperclip className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Select Material to Share</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search and Filter */}
        <div className="p-6 border-b border-gray-200 space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search materials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={selectedFileType}
                onChange={(e) => setSelectedFileType(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                {getUniqueFileTypes().map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Materials List - Grouped by Course */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading materials...</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-8">
              <File className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No materials found for your courses</p>
            </div>
          ) : (
            <div className="space-y-8">
              {filteredGroups.map(group => (
                <div key={group.course_id}>
                  <div className="mb-4 pb-2 border-b border-gray-200 flex items-center gap-2">
                    <span className="text-lg font-semibold text-blue-700">{group.course_name}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{group.materials.length} materials</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.materials.map((material) => (
                      <div
                        key={material.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => onSelectMaterial(material)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="text-2xl">
                            {getFileIcon(material.file_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">
                              {material.name}
                            </h3>
                            {material.original_filename && material.original_filename !== material.name && (
                              <p className="text-sm text-gray-500 truncate">
                                {material.original_filename}
                              </p>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-400">
                                {formatFileSize(material.file_size)}
                              </span>
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {material.file_type}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(material.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            Click on a material to share it in your chat. Recipients can view and add it to their courses.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MaterialPicker;
