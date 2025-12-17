'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    Search, 
    SlidersHorizontal, 
    Star, 
    Check, 
    ExternalLink,
    RefreshCw,
    Layout,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCampaignWizard } from '@/lib/campaigns/CampaignWizardContext';
import { getTemplatesFiltered, TemplateListItem, TemplateFilters } from '@/lib/db/templates';
import { FilterPanel } from './FilterPanel';
import Image from 'next/image';

type TabType = 'all' | 'featured';
type SortType = 'newest' | 'oldest' | 'az' | 'za' | 'popular';

interface TemplateLibrarySectionProps {
    className?: string;
    onTemplateSelect?: () => void; // Callback for scroll after selection
}

export function TemplateLibrarySection({ className, onTemplateSelect }: TemplateLibrarySectionProps) {
    const { selectedTemplate, setSelectedTemplate } = useCampaignWizard();
    
    // Tab state
    const [activeTab, setActiveTab] = useState<TabType>('all');
    
    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    
    // Filter state
    const [showFilters, setShowFilters] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [isFeaturedFilter, setIsFeaturedFilter] = useState(false);
    
    // Sort state
    const [sortBy, setSortBy] = useState<SortType>('newest');
    
    // Templates state
    const [templates, setTemplates] = useState<TemplateListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);
    
    // Calculate active filter count for badge
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (selectedCategoryId) count++;
        count += selectedTagIds.length;
        if (isFeaturedFilter) count++;
        return count;
    }, [selectedCategoryId, selectedTagIds, isFeaturedFilter]);
    
    // Fetch templates
    const fetchTemplates = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const filters: TemplateFilters = {};
            
            // Apply search
            if (debouncedSearch.trim()) {
                filters.search = debouncedSearch.trim();
            }
            
            // Apply category
            if (selectedCategoryId) {
                filters.categoryId = selectedCategoryId;
            }
            
            // Apply tags
            if (selectedTagIds.length > 0) {
                filters.tagIds = selectedTagIds;
            }
            
            // Apply featured (from tab OR checkbox)
            if (activeTab === 'featured' || isFeaturedFilter) {
                filters.isFeatured = true;
            }
            
            const results = await getTemplatesFiltered(filters);
            setTemplates(results);
        } catch (err) {
            console.error('Error fetching templates:', err);
            setError('Failed to load templates');
        } finally {
            setIsLoading(false);
        }
    }, [debouncedSearch, selectedCategoryId, selectedTagIds, activeTab, isFeaturedFilter]);
    
    // Fetch on filter changes
    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);
    
    // Sort templates
    const sortedTemplates = useMemo(() => {
        const sorted = [...templates];
        
        switch (sortBy) {
            case 'newest':
                return sorted.sort((a, b) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
            case 'oldest':
                return sorted.sort((a, b) => 
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
            case 'az':
                return sorted.sort((a, b) => a.name.localeCompare(b.name));
            case 'za':
                return sorted.sort((a, b) => b.name.localeCompare(a.name));
            case 'popular':
                return sorted.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
            default:
                return sorted;
        }
    }, [templates, sortBy]);
    
    // Clear all filters
    const clearAllFilters = () => {
        setSelectedCategoryId(null);
        setSelectedTagIds([]);
        setIsFeaturedFilter(false);
        setSearchQuery('');
    };
    
    // Handle template selection
    const handleSelect = (template: TemplateListItem) => {
        setSelectedTemplate(template);
        onTemplateSelect?.();
    };

    return (
        <section className={cn("space-y-4", className)}>
            {/* Section Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Layout className="w-4 h-4 text-purple-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Template Library</h2>
                </div>
                <a
                    href="/dashboard/templates"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                    Browse Full Library
                    <ExternalLink className="w-3.5 h-3.5" />
                </a>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('all')}
                    className={cn(
                        "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                        activeTab === 'all'
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                    )}
                >
                    All Templates
                </button>
                <button
                    onClick={() => setActiveTab('featured')}
                    className={cn(
                        "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                        activeTab === 'featured'
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                    )}
                >
                    <Star className="w-4 h-4" />
                    Featured
                </button>
            </div>
            
            {/* Search and Filter Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search templates..."
                        className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                
                {/* Filters Button */}
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                        "relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        showFilters || activeFilterCount > 0
                            ? "bg-blue-600 text-white"
                            : "bg-white border border-gray-300 text-gray-700 hover:border-gray-400"
                    )}
                >
                    <SlidersHorizontal className="w-4 h-4" />
                    Filters
                    {activeFilterCount > 0 && (
                        <span className={cn(
                            "absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center",
                            showFilters ? "bg-white text-blue-600" : "bg-blue-600 text-white"
                        )}>
                            {activeFilterCount}
                        </span>
                    )}
                </button>
                
                {/* Sort Dropdown */}
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortType)}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="az">A-Z</option>
                    <option value="za">Z-A</option>
                    <option value="popular">Most Popular</option>
                </select>
                
                {/* Refresh */}
                <button
                    onClick={fetchTemplates}
                    disabled={isLoading}
                    className="p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    title="Refresh"
                >
                    <RefreshCw className={cn("w-4 h-4 text-gray-600", isLoading && "animate-spin")} />
                </button>
            </div>
            
            {/* Filter Panel */}
            <FilterPanel
                isOpen={showFilters}
                selectedCategoryId={selectedCategoryId}
                onCategoryChange={setSelectedCategoryId}
                selectedTagIds={selectedTagIds}
                onTagsChange={setSelectedTagIds}
                isFeatured={isFeaturedFilter}
                onFeaturedChange={setIsFeaturedFilter}
                onClearAll={clearAllFilters}
            />
            
            {/* Template Grid */}
            {isLoading ? (
                // Loading skeleton
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden animate-pulse">
                            <div className="aspect-[2/3] bg-gray-200" />
                            <div className="p-4 space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-3/4" />
                                <div className="h-3 bg-gray-200 rounded w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                // Error state
                <div className="text-center py-12">
                    <p className="text-red-500 mb-4">{error}</p>
                    <button
                        onClick={fetchTemplates}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                    >
                        Try Again
                    </button>
                </div>
            ) : sortedTemplates.length === 0 ? (
                // Empty state
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                    <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No templates found</h3>
                    <p className="text-gray-500 mt-1">Try adjusting your filters or search terms</p>
                    <button
                        onClick={clearAllFilters}
                        className="mt-4 px-4 py-2 text-blue-600 font-medium hover:bg-blue-50 rounded-lg"
                    >
                        Clear all filters
                    </button>
                </div>
            ) : (
                // Template grid
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedTemplates.map(template => {
                        const isSelected = selectedTemplate?.id === template.id;
                        
                        return (
                            <button
                                key={template.id}
                                onClick={() => handleSelect(template)}
                                className={cn(
                                    "group relative bg-white border-2 rounded-xl overflow-hidden text-left transition-all",
                                    "hover:shadow-lg hover:scale-[1.02]",
                                    isSelected
                                        ? "border-blue-600 ring-2 ring-blue-200"
                                        : "border-gray-200 hover:border-gray-300"
                                )}
                            >
                                {/* Thumbnail */}
                                <div className="relative aspect-[2/3] bg-gray-100">
                                    {template.thumbnail_url ? (
                                        <Image
                                            src={template.thumbnail_url}
                                            alt={template.name}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Layout className="w-12 h-12 text-gray-300" />
                                        </div>
                                    )}
                                    
                                    {/* Selection checkmark */}
                                    {isSelected && (
                                        <div className="absolute top-2 left-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                            <Check className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                    
                                    {/* Featured badge */}
                                    {template.is_featured && (
                                        <div className="absolute top-2 right-2 px-2 py-1 bg-amber-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
                                            <Star className="w-3 h-3" />
                                            Featured
                                        </div>
                                    )}
                                    
                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-white font-medium text-sm">
                                            Click to select
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Info */}
                                <div className="p-4">
                                    <h3 className="font-medium text-gray-900 truncate">
                                        {template.name}
                                    </h3>
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {template.category_data && (
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                                {template.category_data.icon} {template.category_data.name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
