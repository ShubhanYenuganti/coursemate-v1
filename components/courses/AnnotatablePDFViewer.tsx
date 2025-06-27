"use client";

import React, { useState, useEffect, useRef } from 'react';

interface Annotation {
  id: string;
  pageNumber: number;
  content: string;
  color: string;
  createdAt: Date;
}

interface AnnotatablePDFViewerProps {
  url: string;
}

export default function AnnotatablePDFViewer({ url }: AnnotatablePDFViewerProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [newAnnotationContent, setNewAnnotationContent] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Create a new annotation
  const createAnnotation = () => {
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      pageNumber: currentPage,
      content: '',
      color: getRandomColor(),
      createdAt: new Date()
    };
    
    setAnnotations([...annotations, newAnnotation]);
    setSelectedAnnotation(newAnnotation);
  };
  
  const getRandomColor = () => {
    const colors = ['#ffeb3b', '#4caf50', '#2196f3', '#ff9800', '#e91e63'];
    return colors[Math.floor(Math.random() * colors.length)];
  };
  
  const saveAnnotation = () => {
    if (!selectedAnnotation) return;
    
    setAnnotations(annotations.map(ann => 
      ann.id === selectedAnnotation.id 
        ? { ...ann, content: newAnnotationContent } 
        : ann
    ));
    
    setSelectedAnnotation(null);
    setNewAnnotationContent('');
    
    // Here you would typically save to a database
    console.log('Annotation saved:', { ...selectedAnnotation, content: newAnnotationContent });
  };
  
  const deleteAnnotation = (id: string) => {
    setAnnotations(annotations.filter(ann => ann.id !== id));
    if (selectedAnnotation?.id === id) {
      setSelectedAnnotation(null);
      setNewAnnotationContent('');
    }
  };
  
  const selectAnnotation = (annotation: Annotation) => {
    setSelectedAnnotation(annotation);
    setNewAnnotationContent(annotation.content);
  };
  
  return (
    <div className="flex h-full w-full">
      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto relative">
        <div className="sticky top-0 z-10 bg-white p-2 border-b flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="px-3 py-1 bg-gray-200 rounded"
            >
              Previous Page
            </button>
            <span>
              Page {currentPage}
            </span>
            <button 
              onClick={() => setCurrentPage(p => p + 1)}
              className="px-3 py-1 bg-gray-200 rounded"
            >
              Next Page
            </button>
          </div>
          <button 
            onClick={createAnnotation}
            className="px-3 py-1 bg-blue-500 text-white rounded"
          >
            Add Annotation
          </button>
        </div>
        
        {/* Simple PDF viewer using iframe */}
        <iframe 
          src={url}
          className="w-full h-[calc(100%-50px)]"
          style={{ minHeight: '800px' }}
        />
      </div>
      
      {/* Annotations Panel */}
      <div className="w-80 border-l overflow-y-auto flex flex-col h-full bg-gray-50">
        <div className="p-4 border-b bg-white">
          <h3 className="text-lg font-semibold">Annotations</h3>
          <p className="text-sm text-gray-500">
            {annotations.length} annotation{annotations.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        {/* Selected Annotation Editor */}
        {selectedAnnotation && (
          <div className="p-4 border-b">
            <h4 className="font-medium mb-2">Edit Annotation</h4>
            <textarea
              className="w-full border rounded p-2 mb-2"
              rows={4}
              value={newAnnotationContent}
              onChange={(e) => setNewAnnotationContent(e.target.value)}
              placeholder="Add your notes here..."
            />
            <div className="flex justify-between">
              <button 
                onClick={() => setSelectedAnnotation(null)}
                className="px-3 py-1 bg-gray-200 rounded"
              >
                Cancel
              </button>
              <button 
                onClick={saveAnnotation}
                className="px-3 py-1 bg-blue-500 text-white rounded"
              >
                Save
              </button>
            </div>
          </div>
        )}
        
        {/* Annotations List */}
        <div className="flex-1 overflow-y-auto">
          {annotations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p>No annotations yet</p>
              <p className="text-sm mt-2">
                Click "Add Annotation" to add notes for this page
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {annotations
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                .map(annotation => (
                  <div key={annotation.id} className="p-4 hover:bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: annotation.color }}
                        />
                        <span className="text-sm font-medium">
                          Page {annotation.pageNumber}
                        </span>
                      </div>
                      <div className="flex space-x-1">
                        <button 
                          onClick={() => selectAnnotation(annotation)}
                          className="p-1 text-gray-500 hover:text-blue-500"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => deleteAnnotation(annotation.id)}
                          className="p-1 text-gray-500 hover:text-red-500"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {annotation.content || <span className="italic text-gray-400">No content</span>}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(annotation.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 