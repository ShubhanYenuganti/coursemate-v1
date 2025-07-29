import React from 'react';
import { Material } from '../types';

interface MaterialPreviewProps {
  material: Material;
}

const MaterialPreview: React.FC<MaterialPreviewProps> = ({ material }) => {
  if (!material) return null;
  const isPdf = material.fileType === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'gif'].includes((material.fileType || '').toLowerCase());

  return (
    <div className="p-2 border rounded mb-2">
      <div className="font-bold mb-1">{material.materialName}</div>
      {isPdf ? (
        <iframe src={material.filePath} title="PDF Preview" className="w-full h-64" />
      ) : isImage ? (
        <img src={material.filePath} alt={material.materialName} className="max-w-full max-h-64" />
      ) : (
        <a href={material.filePath} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">Download/View</a>
      )}
    </div>
  );
};

export default MaterialPreview;
