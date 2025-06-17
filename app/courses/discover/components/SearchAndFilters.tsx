import React from "react"
import { Filter, SortOption } from "../types"

interface SearchAndFiltersProps {
  filters: Filter[]
  onFilterToggle: (filterId: string) => void
  sortOptions: SortOption[]
  selectedSort: string
  onSortChange: (value: string) => void
}

const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  filters,
  onFilterToggle,
  sortOptions,
  selectedSort,
  onSortChange,
}) => {
  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => onFilterToggle(filter.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter.active
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Showing {filters.filter((f) => f.active).length} active filters
        </div>
        <select
          value={selectedSort}
          onChange={(e) => onSortChange(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default SearchAndFilters 