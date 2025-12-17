'use client';

import React from 'react';
import { X, Folder, Tag, Star, ImageIcon } from 'lucide-react';
import { DynamicDataFilter } from '@/lib/utils/extractDynamicData';
import { DbCategory, DbTag } from '@/types/database.types';

interface ActiveFilterPillsProps {
    // Category
    selectedCategoryId: string | null;
    categories: DbCategory[];
    onCategoryRemove: () => void;
    // Tags
    selectedTagIds: string[];
    tags: DbTag[];
    onTagRemove: (tagId: string) => void;
    // Featured
    isFeatured: boolean;
    onFeaturedRemove: () => void;
    // Dynamic Data
    dynamicDataFilter: DynamicDataFilter | null;
    onDynamicDataRemove: () => void;
    // Clear all
    onClearAll: () => void;
}

export function ActiveFilterPills({
    selectedCategoryId,
    categories,
    onCategoryRemove,
    selectedTagIds,
    tags,
    onTagRemove,
    isFeatured,
    onFeaturedRemove,
    dynamicDataFilter,
    onDynamicDataRemove,
    onClearAll,
}: ActiveFilterPillsProps) {
    const selectedCategory = categories.find(c => c.id === selectedCategoryId);
    const selectedTags = tags.filter(t => selectedTagIds.includes(t.id));
    
    const hasFilters = selectedCategoryId || selectedTagIds.length > 0 || isFeatured || dynamicDataFilter;
    
    if (!hasFilters) return null;
    
    // Format dynamic data filter text
    const getDynamicDataText = (): string => {
        if (!dynamicDataFilter) return '';
        
        const parts: string[] = [];
        const logicText = dynamicDataFilter.logic === 'exactly' ? '' 
            : dynamicDataFilter.logic === 'at_least' ? '≥ ' 
            : '≤ ';
        
        if (dynamicDataFilter.images !== undefined) {
            parts.push(`${logicText}${dynamicDataFilter.images} img`);
        }
        if (dynamicDataFilter.texts !== undefined) {
            parts.push(`${logicText}${dynamicDataFilter.texts} txt`);
        }
        
        return parts.join(', ');
    };
    
    return (
        <div className="flex items-center gap-2 flex-wrap py-2">
            <span className="text-xs text-gray-500 font-medium">Active filters:</span>
            
            {/* Category Pill */}
            {selectedCategory && (
                <button
                    onClick={onCategoryRemove}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium hover:bg-blue-200 transition-colors group"
                >
                    <Folder className="w-3 h-3" />
                    {selectedCategory.icon && <span>{selectedCategory.icon}</span>}
                    {selectedCategory.name}
                    <X className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                </button>
            )}
            
            {/* Tag Pills */}
            {selectedTags.map(tag => (
                <button
                    key={tag.id}
                    onClick={() => onTagRemove(tag.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium hover:bg-purple-200 transition-colors group"
                >
                    <Tag className="w-3 h-3" />
                    {tag.name}
                    <X className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                </button>
            ))}
            
            {/* Featured Pill */}
            {isFeatured && (
                <button
                    onClick={onFeaturedRemove}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium hover:bg-amber-200 transition-colors group"
                >
                    <Star className="w-3 h-3" />
                    Featured
                    <X className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                </button>
            )}
            
            {/* Dynamic Data Pill */}
            {dynamicDataFilter && (
                <button
                    onClick={onDynamicDataRemove}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium hover:bg-green-200 transition-colors group"
                >
                    <ImageIcon className="w-3 h-3" />
                    {getDynamicDataText()}
                    <X className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                </button>
            )}
            
            {/* Clear All */}
            <button
                onClick={onClearAll}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium ml-1"
            >
                Clear all
            </button>
        </div>
    );
}
