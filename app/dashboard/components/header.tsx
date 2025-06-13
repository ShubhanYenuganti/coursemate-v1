'use client';

import React, { useState, useEffect } from 'react';

interface HeaderProps {
  userName?: string;
  quote?: string;
  notificationCount?: number;
  onSearch?: (term: string) => void;
  onNotificationClick?: () => void;
}

export function Header({
  userName = "Nikhil",
  quote = "The beautiful thing about learning is that no one can take it away from you. - B.B. King",
  notificationCount = 1,
  onSearch,
  onNotificationClick
}: HeaderProps) {
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    console.log('Header component mounted');
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Search term changed:', e.target.value);
    setSearchTerm(e.target.value);
    onSearch && onSearch(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Search submitted:', searchTerm);
    onSearch && onSearch(searchTerm);
  };

  console.log('Rendering Header component');

  return (
    <div className="sticky top-0 z-10 border-gray-200 mb-6">
      <div className="flex justify-between items-center px-4 pt-3 pb-0">
        {/* Welcome Section */}
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome back, {userName}!
          </h1>
          <p className="text-gray-600 italic">
            "{quote}"
          </p>
        </div>
        
        {/* Search and Notifications */}
        <div className="flex items-center gap-4">
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                🔍
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-64 pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                placeholder="Search courses, tasks..."
              />
            </div>
          </form>
          
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={onNotificationClick}
              className="w-10 h-10 bg-white border border-gray-300 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors shadow-sm"
            >
              🔔
            </button>
            {notificationCount > 0 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-xs text-white">
                {notificationCount > 9 ? '9+' : notificationCount}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 