'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { LogOutIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type NavItem = {
  name: string;
  href: string;
  icon: string;
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [userName, setUserName] = useState<string>('User');

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch("/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const user = await res.json();
      const fullName = user.name || "User";
      setUserName(fullName);
    };
    fetchUser();
  }, []);

  const handleLogoutClick = () => {
    setIsLogoutDialogOpen(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("name");
    router.push('/login');
  }

  async function handleDeleteAccount() {
    if (!window.confirm("Are you sure you want to delete your account? This cannot be undone.")) return;
    const res = await fetch('/api/users/me', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (res.ok) {
      localStorage.removeItem('token');
      router.push('/signup');
    } else {
      alert('Failed to delete account.');
    }
  }

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
      name: 'Career Prep',
      href: '/career-prep',
      icon: '💼',
    },
    {
      name: 'Resources',
      href: '/resources',
      icon: '📖',
    },
  ];

  return (
    <>
    <div className="w-60 bg-white border-r border-gray-200 p-0 flex flex-col">
      <div className="flex items-center p-5 pb-5 mb-5 border-b border-gray-200">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold mr-3">
          CM
        </div>
        <span className="font-semibold text-gray-800">CourseMate</span>
      </div>
      <button
        onClick={handleDeleteAccount}
        className="mb-3 w-full bg-red-100 text-red-700 font-semibold py-2 rounded hover:bg-red-200 transition"
      >
        Delete Account
      </button>
      <nav className="flex-1">
        {navigation.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`w-full flex items-center px-5 py-3 text-gray-600 hover:bg-gray-100 hover:text-gray-700 transition-all duration-200 ${active ? 'bg-gray-100 text-gray-700 border-r-4 border-indigo-500' : ''
              }`}
            >
              <span className="w-5 h-5 mr-3 opacity-70">{item.icon}</span>
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-5 border-t border-gray-200">
        <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-9 h-9 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
            {userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
            <div>
            <div className="font-medium text-gray-800">{userName}</div>
            <div className="text-xs text-gray-600 cursor-pointer hover:text-indigo-500">
              View Profile
            </div>
          </div>
          </div>
          <button
              onClick={handleLogoutClick}
            className="text-gray-500 hover:text-red-500 transition"
            title="Logout"
          >
            <LogOutIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out? You will need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-red-500 hover:bg-red-600">
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
