'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type React from 'react';

type NavItem = {
  name: string;
  href: string;
  icon: React.ReactNode;
};

export function Sidebar() {
  const pathname = usePathname();

  const navigation: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
      ),
    },
    {
      name: 'My Courses',
      href: '/dashboard/courses',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      name: 'AI Chat',
      href: '/dashboard/chat',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
    },
    {
      name: 'Notes',
      href: '/dashboard/notes',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    {
      name: 'Resources',
      href: '/dashboard/resources',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="w-60 bg-white border-r border-gray-200 p-0 flex flex-col">
      <div className="flex items-center p-5 pb-5 mb-5 border-b border-gray-200">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold mr-3">
          SB
        </div>
        <span className="font-semibold text-gray-800">StudyBuddy</span>
      </div>
      <nav className="flex-1">
        {navigation.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-5 py-3 text-gray-600 hover:bg-gray-100 hover:text-gray-700 transition-all duration-200 ${
                active ? 'bg-gray-100 text-gray-700 border-r-4 border-indigo-500' : ''
              }`}
            >
              <span className="w-5 h-5 mr-3 opacity-70">{item.icon}</span>
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-5 border-t border-gray-200">
        <div className="flex items-center">
          <div className="w-9 h-9 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold mr-3">NS</div>
          <div className="flex-1">
            <div className="font-medium text-gray-800">Nikhil Sharma</div>
            <div className="text-xs text-gray-600">View Profile</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
