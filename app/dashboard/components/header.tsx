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
    <header className="w-full bg-indigo-50 border-b border-gray-200 shadow-sm px-6 flex items-center justify-between" style={{height: '73px', minHeight: '73px', maxHeight: '73px'}}>
      {/* Left: Greeting only */}
      <div className="flex flex-col justify-center">
        <span className="text-lg font-bold text-gray-800 leading-tight">Welcome back, {userName}!</span>
      </div>
      {/* Right: Search and Notifications */}
      <div className="flex items-center gap-4">
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-56 pl-9 pr-4 py-1.5 rounded-full bg-white text-gray-800 placeholder-gray-400 border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="Search courses, tasks..."
          />
          <span className="absolute left-3 top-1.5 text-gray-400">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-2-2"/></svg>
          </span>
        </form>
        <NotificationsDropdown />
      </div>
    </header>
  );
} 