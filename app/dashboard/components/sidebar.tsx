'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type React from 'react';

type NavItem = {
  name: string;
  href: string;
  icon: string;
};

export function Sidebar() {
  const pathname = usePathname();

  const navigation: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: '📊',
    },
    {
      name: 'My Courses',
      href: '/courses',
      icon: '📚',
    },
    {
      name: 'Calendar',
      href: '/calendar',
      icon: '📅',
    },
    {
      name: 'Messages',
      href: '/chat',
      icon: '💬',
    },
    {
      name: 'Notes',
      href: '/notes',
      icon: '📝',
    },
    {
      name: 'Resources',
      href: '/resources',
      icon: '📖',
    },
    {
      name: 'Study Plan',
      href: '/study-plan',
      icon: '📋',
    },
  ];

  return (
    <div className="w-60 bg-white border-r border-gray-200 p-0 flex flex-col">
      <div className="flex items-center p-5 pb-5 mb-5 border-b border-gray-200">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold mr-3">
          CM
        </div>
        <span className="font-semibold text-gray-800">CourseMate</span>
      </div>
      <nav className="flex-1">
        {navigation.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`w-full flex items-center px-5 py-3 text-gray-600 hover:bg-gray-100 hover:text-gray-700 transition-all duration-200 ${
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
          <div className="w-9 h-9 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
            NS
          </div>
          <div className="flex-1">
            <div className="font-medium text-gray-800">Nikhil Sharma</div>
            <div className="text-xs text-gray-600 cursor-pointer hover:text-indigo-500">
              View Profile
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
