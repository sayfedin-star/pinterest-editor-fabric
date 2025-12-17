'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, LayoutGrid, List, RefreshCw, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export type ViewMode = 'grid' | 'list';

interface TemplateToolbarProps {
    // Search
    searchQuery: string;
    onSearchChange: (query: string) => void;
    // Filters
    showFilters: boolean;
    onToggleFilters: () => void;
    activeFilterCount: number;
    // View
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
    // Refresh
    onRefresh: () => void;
    isLoading: boolean;
    // Selection
    totalCount: number;
    selectedCount: number;
    onSelectAll: () => void;
    onClearSelection: () => void;
}

export function TemplateToolbar({
    searchQuery,
    onSearchChange,
    showFilters,
    onToggleFilters,
    activeFilterCount,
    viewMode,
    onViewModeChange,
    onRefresh,
    isLoading,
    totalCount,
    selectedCount,
    onSelectAll,
    onClearSelection,
}: TemplateToolbarProps) {
    const [localSearch, setLocalSearch] = useState(searchQuery);
    
    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localSearch !== searchQuery) {
                onSearchChange(localSearch);
            }
        }, 300);
        
        return () => clearTimeout(timer);
    }, [localSearch, searchQuery, onSearchChange]);
    
    // Save view preference to localStorage
    const handleViewModeChange = useCallback((mode: ViewMode) => {
        onViewModeChange(mode);
        localStorage.setItem('template_view_mode', mode);
    }, [onViewModeChange]);
    
    return (
        <div className="flex flex-col gap-3">
            {/* Main Toolbar Row */}
            <div className="flex items-center gap-3 flex-wrap">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        placeholder="Search templates..."
                        className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {localSearch && (
                        <button
                            onClick={() => {
                                setLocalSearch('');
                                onSearchChange('');
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                
                {/* Filters Button */}
                <button
                    onClick={onToggleFilters}
                    className={cn(
                        "flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors",
                        showFilters
                            ? "bg-blue-50 border-blue-300 text-blue-700"
                            : "bg-white border-gray-300 text-gray-700 hover:border-gray-400"
                    )}
                >
                    <Filter className="w-4 h-4" />
                    Filters
                    {activeFilterCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full min-w-[20px] text-center">
                            {activeFilterCount}
                        </span>
                    )}
                </button>
                
                {/* View Toggle */}
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                    <button
                        onClick={() => handleViewModeChange('grid')}
                        className={cn(
                            "p-2 transition-colors",
                            viewMode === 'grid'
                                ? "bg-blue-50 text-blue-600"
                                : "bg-white text-gray-600 hover:bg-gray-50"
                        )}
                        title="Grid view"
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleViewModeChange('list')}
                        className={cn(
                            "p-2 transition-colors border-l border-gray-300",
                            viewMode === 'list'
                                ? "bg-blue-50 text-blue-600"
                                : "bg-white text-gray-600 hover:bg-gray-50"
                        )}
                        title="List view"
                    >
                        <List className="w-4 h-4" />
                    </button>
                </div>
                
                {/* Refresh Button */}
                <button
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    title="Refresh"
                >
                    <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                </button>
                
                {/* New Template Button */}
                <Link
                    href="/editor"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Template
                </Link>
            </div>
            
            {/* Selection Row */}
            {totalCount > 0 && (
                <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span>{totalCount} template{totalCount !== 1 ? 's' : ''}</span>
                    {selectedCount > 0 ? (
                        <button
                            onClick={onClearSelection}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Clear selection ({selectedCount})
                        </button>
                    ) : (
                        <button
                            onClick={onSelectAll}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Select all
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
