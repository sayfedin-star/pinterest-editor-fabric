'use client';

import React, { useEffect } from 'react';
import { Folder, Tag, Star, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCategoryStore } from '@/stores/categoryStore';
import { useTagStore } from '@/stores/tagStore';

interface FilterPanelProps {
    isOpen: boolean;
    // Filter values
    selectedCategoryId: string | null;
    onCategoryChange: (id: string | null) => void;
    selectedTagIds: string[];
    onTagsChange: (ids: string[]) => void;
    isFeatured: boolean;
    onFeaturedChange: (featured: boolean) => void;
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
    onClearAll,
}: FilterPanelProps) {
    // Stores
    const { categories, fetchCategories, isLoading: loadingCategories } = useCategoryStore();
    const { tags, fetchTags, isLoading: loadingTags } = useTagStore();
    
    // Fetch categories and tags on mount
    useEffect(() => {
        fetchCategories(true); // with counts
        fetchTags(true); // with counts
    }, [fetchCategories, fetchTags]);
    
    // Toggle tag selection
    const toggleTag = (tagId: string) => {
        if (selectedTagIds.includes(tagId)) {
            onTagsChange(selectedTagIds.filter(id => id !== tagId));
        } else {
            onTagsChange([...selectedTagIds, tagId]);
        }
    };
    
    if (!isOpen) return null;
    
    const hasActiveFilters = selectedCategoryId || selectedTagIds.length > 0 || isFeatured;

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
                    {/* All button */}
                    <button
                        onClick={() => onCategoryChange(null)}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                            selectedCategoryId === null
                                ? "bg-blue-600 text-white"
                                : "bg-white border border-gray-300 text-gray-700 hover:border-gray-400"
                        )}
                    >
                        <span className="flex items-center gap-1.5">
                            <Folder className="w-3.5 h-3.5" />
                            All
                        </span>
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
                
                {/* Selected tags */}
                {selectedTagIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 pb-2">
                        {tags
                            .filter(tag => selectedTagIds.includes(tag.id))
                            .map(tag => (
                                <button
                                    key={tag.id}
                                    onClick={() => toggleTag(tag.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium"
                                >
                                    <Check className="w-3.5 h-3.5" />
                                    {tag.name}
                                    <X className="w-3.5 h-3.5 hover:text-blue-200" />
                                </button>
                            ))
                        }
                    </div>
                )}
                
                {/* Available tags */}
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
                        tags
                            .filter(tag => !selectedTagIds.includes(tag.id))
                            .map(tag => (
                                <button
                                    key={tag.id}
                                    onClick={() => toggleTag(tag.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:border-gray-400 transition-colors"
                                >
                                    <Tag className="w-3.5 h-3.5 text-gray-400" />
                                    {tag.name}
                                    {(tag.template_count ?? 0) > 0 && (
                                        <span className="text-xs text-gray-400">
                                            ({tag.template_count})
                                        </span>
                                    )}
                                </button>
                            ))
                    )}
                </div>
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
                        Featured Template
                    </span>
                </label>
            </div>
        </div>
    );
}
