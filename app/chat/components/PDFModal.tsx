"use client";
import React from "react";
import { PDFViewer } from "@/components/courses/pdf-viewer";
import { X } from "lucide-react";

interface PDFModalProps {
  url: string;
  title: string;
  onClose: () => void;
  onDownload: () => void;
}

const PDFModal: React.FC<PDFModalProps> = ({ url, title, onClose, onDownload }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl h-[80vh] flex flex-col relative">
        <button
          className="absolute top-2 right-2 p-2 rounded-full bg-gray-100 hover:bg-gray-200"
          onClick={onClose}
          title="Close"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1 overflow-hidden">
          <PDFViewer url={url} title={title} onDownload={onDownload} />
        </div>
      </div>
    </div>
  );
};

export default PDFModal;
