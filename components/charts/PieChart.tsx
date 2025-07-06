"use client";

import React from 'react';

interface PieChartProps {
  data: {
    label: string;
    value: number;
    color: string;
  }[];
  title?: string;
  size?: number;
}

export const PieChart: React.FC<PieChartProps> = ({ 
  data, 
  title = "Distribution", 
  size = 200 
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        )}
        <div className="flex items-center justify-center h-32 text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  let currentAngle = 0;
  const radius = size / 2 - 20;
  const centerX = size / 2;
  const centerY = size / 2;

  const createPath = (startAngle: number, endAngle: number) => {
    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);
    
    const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
    
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <div className="flex items-center justify-center">
        <svg width={size} height={size} className="mb-4">
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100;
            const startAngle = currentAngle;
            const endAngle = currentAngle + (percentage / 100) * 2 * Math.PI;
            currentAngle = endAngle;
            
            return (
              <path
                key={index}
                d={createPath(startAngle, endAngle)}
                fill={item.color}
                stroke="white"
                strokeWidth="2"
              />
            );
          })}
        </svg>
      </div>
      
      {/* Legend */}
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            ></div>
            <span className="text-sm text-gray-700">{item.label}</span>
            <span className="text-sm text-gray-500 ml-auto">
              {((item.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}; 