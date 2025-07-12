import React from "react";

export const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
  <div className="w-full">
    <div className="h-4 bg-gray-200 w-full rounded-full shadow-inner border border-gray-100">
      <div
        className="h-4 bg-green-500 rounded-full shadow transition-all duration-500 ease-in-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>
); 