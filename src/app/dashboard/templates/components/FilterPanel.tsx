'use client';

import React, { useEffect } from 'react';
import { Folder, Tag, Star, ImageIcon, Type, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCategoryStore } from '@/stores/categoryStore';
import { useTagStore } from '@/stores/tagStore';
import { DynamicDataFilter } from '@/lib/utils/extractDynamicData';

export type FilterLogic = 'exactly' | 'at_least' | 'at_most';

interface FilterPanelProps {
    isOpen: boolean;
    // Category filter
    selectedCategoryId: string | null;
    onCategoryChange: (id: string | null) => void;
    // Tags filter
    selectedTagIds: string[];
    onTagsChange: (ids: string[]) => void;
    // Featured filter
    isFeatured: boolean;
    onFeaturedChange: (featured: boolean) => void;
    // Dynamic data filter
    dynamicDataFilter: DynamicDataFilter | null;
    onDynamicDataFilterChange: (filter: DynamicDataFilter | null) => void;
    // Actions
    onClearAll: () => void;
}

export function FilterPanel({
    isOpen,
    selectedCategoryId,
    onCategoryChange,
    selectedTagIds,
    onTagsChange,
    isFeatured,
    onFeaturedChange,
    dynamicDataFilter,
    onDynamicDataFilterChange,
    onClearAll,
}: FilterPanelProps) {
    // Stores
    const { categories, fetchCategories, isLoading: loadingCategories } = useCategoryStore();
    const { tags, fetchTags, isLoading: loadingTags } = useTagStore();
    
    // Fetch categories and tags on mount
    useEffect(() => {
        fetchCategories(true);
        fetchTags(true);
    }, [fetchCategories, fetchTags]);
    
    // Toggle tag selection
    const toggleTag = (tagId: string) => {
        if (selectedTagIds.includes(tagId)) {
            onTagsChange(selectedTagIds.filter(id => id !== tagId));
        } else {
            onTagsChange([...selectedTagIds, tagId]);
        }
    };
    
    // Handle dynamic data filter changes
    const updateDynamicFilter = (
        field: 'images' | 'texts' | 'logic',
        value: number | FilterLogic
    ) => {
        const current = dynamicDataFilter || { logic: 'exactly' as FilterLogic };
        
        if (field === 'logic') {
            onDynamicDataFilterChange({
                ...current,
                logic: value as FilterLogic,
            });
        } else {
            const numValue = value as number;
            const newFilter = { ...current };
            
            if (numValue >= 0) {
                newFilter[field] = numValue;
            } else {
                delete newFilter[field];
            }
            
            // If no filters set, clear
            if (newFilter.images === undefined && newFilter.texts === undefined) {
                onDynamicDataFilterChange(null);
            } else {
                onDynamicDataFilterChange(newFilter);
            }
        }
    };
    
    const hasActiveFilters = selectedCategoryId || selectedTagIds.length > 0 || isFeatured || dynamicDataFilter;
    
    if (!isOpen) return null;
    
    return (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-5 animate-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Filter Templates</h3>
                {hasActiveFilters && (
                    <button
                        onClick={onClearAll}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                        Clear all filters
                    </button>
                )}
            </div>
            
            {/* Category Filter */}
            <div className="space-y-2">
                <h4 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <Folder className="w-3.5 h-3.5" />
                    Category
                </h4>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => onCategoryChange(null)}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                            selectedCategoryId === null
                                ? "bg-blue-600 text-white"
                                : "bg-white border border-gray-300 text-gray-700 hover:border-gray-400"
                        )}
                    >
                        All
                    </button>
                    
                    {loadingCategories ? (
                        <div className="flex gap-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-20 h-8 bg-gray-200 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        categories.map(category => (
                            <button
                                key={category.id}
                                onClick={() => onCategoryChange(category.id)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                                    selectedCategoryId === category.id
                                        ? "bg-blue-600 text-white"
                                        : "bg-white border border-gray-300 text-gray-700 hover:border-gray-400"
                                )}
                            >
                                <span className="flex items-center gap-1.5">
                                    {category.icon && <span>{category.icon}</span>}
                                    {category.name}
                                    {(category.template_count ?? 0) > 0 && (
                                        <span className={cn(
                                            "text-xs",
                                            selectedCategoryId === category.id 
                                                ? "text-blue-200" 
                                                : "text-gray-400"
                                        )}>
                                            ({category.template_count})
                                        </span>
                                    )}
                                </span>
                            </button>
                        ))
                    )}
                </div>
            </div>
            
            {/* Tags Filter */}
            <div className="space-y-2">
                <h4 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <Tag className="w-3.5 h-3.5" />
                    Tags
                    {selectedTagIds.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                            {selectedTagIds.length}
                        </span>
                    )}
                </h4>
                <div className="flex flex-wrap gap-2">
                    {loadingTags ? (
                        <div className="flex gap-2">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="w-16 h-8 bg-gray-200 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : tags.length === 0 ? (
                        <p className="text-sm text-gray-500">No tags available</p>
                    ) : (
                        tags.map(tag => (
                            <button
                                key={tag.id}
                                onClick={() => toggleTag(tag.id)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                                    selectedTagIds.includes(tag.id)
                                        ? "bg-blue-600 text-white"
                                        : "bg-white border border-gray-300 text-gray-700 hover:border-gray-400"
                                )}
                            >
                                {tag.name}
                            </button>
                        ))
                    )}
                </div>
            </div>
            
            {/* Dynamic Data Filter */}
            <div className="space-y-3">
                <h4 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Dynamic Data
                </h4>
                
                <div className="grid grid-cols-2 gap-3">
                    {/* Images */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1 text-xs text-gray-600">
                            <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                            Images
                        </label>
                        <div className="flex items-center">
                            <button
                                onClick={() => updateDynamicFilter('images', (dynamicDataFilter?.images ?? 0) - 1)}
                                disabled={(dynamicDataFilter?.images ?? 0) <= 0}
                                className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-l-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                                type="number"
                                min="0"
                                value={dynamicDataFilter?.images ?? ''}
                                onChange={(e) => updateDynamicFilter('images', parseInt(e.target.value) || -1)}
                                placeholder="-"
                                className="w-12 h-8 text-center border-y border-gray-200 text-sm focus:outline-none"
                            />
                            <button
                                onClick={() => updateDynamicFilter('images', (dynamicDataFilter?.images ?? -1) + 1)}
                                className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-r-lg transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                    
                    {/* Texts */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1 text-xs text-gray-600">
                            <Type className="w-3.5 h-3.5 text-gray-500" />
                            Texts
                        </label>
                        <div className="flex items-center">
                            <button
                                onClick={() => updateDynamicFilter('texts', (dynamicDataFilter?.texts ?? 0) - 1)}
                                disabled={(dynamicDataFilter?.texts ?? 0) <= 0}
                                className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-l-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                                type="number"
                                min="0"
                                value={dynamicDataFilter?.texts ?? ''}
                                onChange={(e) => updateDynamicFilter('texts', parseInt(e.target.value) || -1)}
                                placeholder="-"
                                className="w-12 h-8 text-center border-y border-gray-200 text-sm focus:outline-none"
                            />
                            <button
                                onClick={() => updateDynamicFilter('texts', (dynamicDataFilter?.texts ?? -1) + 1)}
                                className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-r-lg transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Logic Selector */}
                {dynamicDataFilter && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Match:</span>
                        <select
                            value={dynamicDataFilter.logic}
                            onChange={(e) => updateDynamicFilter('logic', e.target.value as FilterLogic)}
                            className="text-xs bg-white border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="exactly">Exactly</option>
                            <option value="at_least">At least</option>
                            <option value="at_most">At most</option>
                        </select>
                    </div>
                )}
            </div>
            
            {/* Featured Filter */}
            <div className="pt-2 border-t border-gray-200">
                <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                        type="checkbox"
                        checked={isFeatured}
                        onChange={(e) => onFeaturedChange(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700 group-hover:text-gray-900">
                        <Star className="w-4 h-4 text-amber-500" />
                        Featured Only
                    </span>
                </label>
            </div>
        </div>
    );
}
