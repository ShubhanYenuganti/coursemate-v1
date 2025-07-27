"use client"

import React from 'react';
import { Search, Filter, SortAsc } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CommunitySearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
}

export function CommunitySearch({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  sortBy,
  setSortBy,
}: CommunitySearchProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full">
      {/* Search Bar */}
      <div className="relative flex-1 max-w-lg">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          placeholder="Search posts, tags, or users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-sm w-full bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
        />
      </div>

      {/* Filters - Now on same line */}
      <div className="flex gap-3">
        {/* Unique Filters Dropdown (not redundant with tab bar) */}
        <div className="min-w-[200px]">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-sm bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
              <Filter className="w-5 h-5 mr-2 text-gray-500" />
              <SelectValue placeholder="All Filters" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 rounded-xl shadow-xl">
              <SelectItem value="all" className="py-3 px-4 rounded-lg">All Posts</SelectItem>
              <SelectItem value="my-posts" className="py-3 px-4 rounded-lg">My Posts</SelectItem>
              <SelectItem value="unanswered" className="py-3 px-4 rounded-lg">Unanswered</SelectItem>
              <SelectItem value="most-upvoted" className="py-3 px-4 rounded-lg">Most Upvoted</SelectItem>
              <SelectItem value="ta-instructor" className="py-3 px-4 rounded-lg">TA/Instructor Posts</SelectItem>
              <SelectItem value="has-attachments" className="py-3 px-4 rounded-lg">Has Attachments</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort Filter */}
        <div className="min-w-[200px]">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-sm bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
              <SortAsc className="w-5 h-5 mr-2 text-gray-500" />
              <SelectValue placeholder="Most Recent" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 rounded-xl shadow-xl">
              <SelectItem value="recent" className="py-3 px-4 rounded-lg">Most Recent</SelectItem>
              <SelectItem value="popular" className="py-3 px-4 rounded-lg">Most Popular</SelectItem>
              <SelectItem value="unanswered" className="py-3 px-4 rounded-lg">Unanswered First</SelectItem>
              <SelectItem value="activity" className="py-3 px-4 rounded-lg">Most Active</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
