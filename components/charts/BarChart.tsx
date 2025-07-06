"use client";

import React from 'react';

interface BarChartProps {
  data: {
    label: string;
    value: number;
    color?: string;
  }[];
  title?: string;
  height?: number;
  maxValue?: number;
}

export const BarChart: React.FC<BarChartProps> = ({ 
  data, 
  title = "Bar Chart", 
  height = 200,
  maxValue 
}) => {
  const max = maxValue || Math.max(...data.map(item => item.value));
  const barHeight = height - 60; // Account for labels and padding
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <div className="space-y-3">
        {data.map((item, index) => {
          const percentage = max > 0 ? (item.value / max) * 100 : 0;
          const color = item.color || (index % 2 === 0 ? 'bg-blue-600' : 'bg-green-600');
          
          return (
            <div key={item.label} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700 font-medium">{item.label}</span>
                <span className="text-gray-600">{item.value}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`${color} h-3 rounded-full transition-all duration-500 ease-out`}
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