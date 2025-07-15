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
    <header className="w-full bg-white border-b border-gray-200 px-6 py-2 flex items-center justify-between" style={{minHeight: '56px'}}>
      {/* Left: Greeting only */}
      <div className="flex flex-col justify-center">
        <span className="text-lg font-semibold text-gray-800 leading-tight">Welcome back, {userName}!</span>
      </div>
      {/* Right: Search and Notifications */}
      <div className="flex items-center gap-4">
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-56 pl-9 pr-4 py-1.5 rounded-full bg-gray-100 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 border border-gray-200 text-sm"
            placeholder="Search courses, tasks..."
          />
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-base">🔍</span>
        </form>
        <NotificationsDropdown />
      </div>
    </header>
  );
} 