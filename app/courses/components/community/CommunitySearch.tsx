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
    <div className="flex items-center gap-4">
      {/* Search Bar */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search posts, tags, or users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white/50 backdrop-blur-sm border-gray-200/50"
        />
      </div>

      {/* Category Filter */}
      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
        <SelectTrigger className="w-40 bg-white/50 backdrop-blur-sm border-gray-200/50">
          <Filter className="w-4 h-4 mr-2" />
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
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
        <SelectTrigger className="w-40 bg-white/50 backdrop-blur-sm border-gray-200/50">
          <SortAsc className="w-4 h-4 mr-2" />
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="recent">Most Recent</SelectItem>
          <SelectItem value="popular">Most Popular</SelectItem>
          <SelectItem value="unanswered">Unanswered First</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
