import React, { useState, useRef, useEffect } from 'react';
import { X, RotateCcw, Check } from 'lucide-react';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onCrop: (croppedImageUrl: string) => void;
  aspectRatio?: number; // 16/9 for banner
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  onCrop,
  aspectRatio = 896 / 192 // Exact banner dimensions: 896 x 192
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && imageUrl) {
      setImageLoaded(false);
    }
  }, [isOpen, imageUrl]);

  const handleImageLoad = () => {
    if (imageRef.current) {
      const { naturalWidth, naturalHeight } = imageRef.current;
      setImageSize({ width: naturalWidth, height: naturalHeight });
      setImageLoaded(true);
      
      // Set initial crop to match the exact banner dimensions (896 x 192)
      const containerWidth = containerRef.current?.clientWidth || 600;
      const containerHeight = containerRef.current?.clientHeight || 400;
      
      // Exact banner aspect ratio: 896/192 = 4.67
      const bannerAspectRatio = 896 / 192;
      
      const cropWidth = Math.min(containerWidth * 0.8, naturalWidth);
      const cropHeight = cropWidth / bannerAspectRatio;
      
      setCrop({
        x: (containerWidth - cropWidth) / 2,
        y: (containerHeight - cropHeight) / 2,
        width: cropWidth,
        height: cropHeight
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageLoaded) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if click is within crop area
    if (x >= crop.x && x <= crop.x + crop.width &&
        y >= crop.y && y <= crop.y + crop.height) {
      // Start dragging
      const startX = x - crop.x;
      const startY = y - crop.y;
      
      const handleMouseMove = (e: MouseEvent) => {
        const newX = e.clientX - rect.left - startX;
        const newY = e.clientY - rect.top - startY;
        
        setCrop(prev => ({
          ...prev,
          x: Math.max(0, Math.min(newX, rect.width - prev.width)),
          y: Math.max(0, Math.min(newY, rect.height - prev.height))
        }));
      };
      
      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  };

  const handleCropConfirm = () => {
    if (!imageRef.current) return;
    
    // Create a canvas to crop the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { naturalWidth, naturalHeight } = imageRef.current;
    const containerWidth = containerRef.current?.clientWidth || 600;
    const containerHeight = containerRef.current?.clientHeight || 400;
    
    // Calculate the actual crop coordinates in the original image
    const scaleX = naturalWidth / containerWidth;
    const scaleY = naturalHeight / containerHeight;
    
    const cropX = crop.x * scaleX;
    const cropY = crop.y * scaleY;
    const cropWidth = crop.width * scaleX;
    const cropHeight = crop.height * scaleY;
    
    // Set canvas size to the crop dimensions
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    
    // Draw the cropped portion
    ctx.drawImage(
      imageRef.current,
      cropX, cropY, cropWidth, cropHeight,
      0, 0, cropWidth, cropHeight
    );
    
    // Convert to blob and create URL
    canvas.toBlob((blob) => {
      if (blob) {
        const croppedImageUrl = URL.createObjectURL(blob);
        onCrop(croppedImageUrl);
        onClose();
      }
    }, 'image/jpeg', 0.9);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Crop Banner Image</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-gray-600 text-sm">
            Drag the crop area to select the portion of the image you want as your banner.
            The banner will maintain a 896:192 aspect ratio (4.67:1) to match the exact display dimensions.
          </p>
        </div>
        
        <div 
          ref={containerRef}
          className="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100"
          style={{ width: '600px', height: '400px' }}
          onMouseDown={handleMouseDown}
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Uploaded image"
            className="w-full h-full object-contain"
            onLoad={handleImageLoad}
          />
          
          {imageLoaded && (
            <div
              className="absolute border-2 border-white cursor-move"
              style={{
                left: `${crop.x}px`,
                top: `${crop.y}px`,
                width: `${crop.width}px`,
                height: `${crop.height}px`,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
              }}
            >
              {/* Corner indicators */}
              <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white"></div>
              <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white"></div>
              <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white"></div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white"></div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCropConfirm}
            disabled={!imageLoaded}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Use This Crop
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal; 