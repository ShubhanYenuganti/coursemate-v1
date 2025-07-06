"use client";

import React from 'react';

interface ProgressChartProps {
  data: {
    label: string;
    value: number;
    total: number;
    color?: string;
  }[];
  title?: string;
  height?: number;
}

export const ProgressChart: React.FC<ProgressChartProps> = ({ 
  data, 
  title = "Progress Overview", 
  height = 200 
}) => {
  const maxValue = Math.max(...data.map(item => item.total));
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <div className="space-y-3">
        {data.map((item, index) => {
          const percentage = item.total > 0 ? (item.value / item.total) * 100 : 0;
          const color = item.color || (index === 0 ? 'bg-blue-600' : index === 1 ? 'bg-green-600' : 'bg-purple-600');
          
          return (
            <div key={item.label} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700 font-medium">{item.label}</span>
                <span className="text-gray-600">
                  {item.value}/{item.total} ({percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`${color} h-2 rounded-full transition-all duration-500 ease-out`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}; 