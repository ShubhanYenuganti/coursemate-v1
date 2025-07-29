"use client";
import React from "react";

interface SimplePDFViewerProps {
  url: string;
}

const SimplePDFViewer: React.FC<SimplePDFViewerProps> = ({ url }) => {
  return (
    <iframe
      src={url}
      className="w-full h-full border-0"
      style={{ minHeight: "800px" }}
      title="PDF Preview"
    />
  );
};

export default SimplePDFViewer;
