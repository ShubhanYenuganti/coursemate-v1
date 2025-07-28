'use client';

import React, { useState, useEffect } from 'react';
import NotificationsDropdown from './NotificationsDropdown';

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
    <header className="w-full bg-indigo-50 border-b border-gray-200 shadow-sm px-4 sm:px-6 flex items-center justify-between" style={{height: '73px', minHeight: '73px', maxHeight: '73px'}}>
      {/* Left: Greeting */}
      <div className="flex flex-col justify-center flex-1 min-w-0">
        <span className="text-sm sm:text-lg font-bold text-gray-800 leading-tight truncate">
          Welcome back, {userName}!
        </span>
      </div>
      
      {/* Right: Search and Notifications */}
      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        {/* Search - Hidden on very small screens, show on sm+ */}
        <form onSubmit={handleSearchSubmit} className="relative hidden sm:block">
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-40 sm:w-56 pl-8 sm:pl-9 pr-3 sm:pr-4 py-1 sm:py-1.5 rounded-full bg-white text-gray-800 placeholder-gray-400 border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 text-sm"
            placeholder="Search courses, tasks..."
          />
          <span className="absolute left-2 sm:left-3 top-1 sm:top-1.5 text-gray-400">
            <svg width="16" height="16" className="sm:w-[18px] sm:h-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-2-2"/>
            </svg>
          </span>
        </form>
        
        {/* Mobile search icon - show only on small screens */}
        <button className="sm:hidden p-2 text-gray-400 hover:text-gray-600 transition-colors">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-2-2"/>
          </svg>
        </button>
        
        <NotificationsDropdown />
      </div>
    </header>
  );
} 