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
    <div className="flex items-center gap-2 sm:gap-3 w-full">
      {/* Search Bar */}
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
        <Input
          placeholder="Search posts, tags, or users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-4 h-10 bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all duration-200 rounded-lg"
        />
      </div>

      {/* Category Filter */}
      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
        <SelectTrigger className="w-32 sm:w-36 h-10 bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-sm hover:bg-white/90 transition-all duration-200 rounded-lg">
          <Filter className="w-4 h-4 mr-1 flex-shrink-0 text-gray-500" />
          <SelectValue placeholder="Type" className="text-sm" />
        </SelectTrigger>
        <SelectContent className="bg-white/95 backdrop-blur-sm">
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="question">Questions</SelectItem>
          <SelectItem value="discussion">Discussions</SelectItem>
          <SelectItem value="study-group">Study Groups</SelectItem>
          <SelectItem value="resource-sharing">Resources</SelectItem>
          <SelectItem value="help-wanted">Help Wanted</SelectItem>
        </SelectContent>
      </Select>

      {/* Sort Options */}
      <Select value={sortBy} onValueChange={setSortBy}>
        <SelectTrigger className="w-28 sm:w-32 h-10 bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-sm hover:bg-white/90 transition-all duration-200 rounded-lg">
          <SortAsc className="w-4 h-4 mr-1 flex-shrink-0 text-gray-500" />
          <SelectValue placeholder="Sort" className="text-sm" />
        </SelectTrigger>
        <SelectContent className="bg-white/95 backdrop-blur-sm">
          <SelectItem value="recent">Most Recent</SelectItem>
          <SelectItem value="popular">Most Popular</SelectItem>
          <SelectItem value="unanswered">Unanswered First</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
