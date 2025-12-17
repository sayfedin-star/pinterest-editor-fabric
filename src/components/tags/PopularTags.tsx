/**
 * Popular Tags Widget
 * 
 * Shows the most-used tags as a tag cloud.
 * Tags are sized based on usage frequency.
 */

'use client';

import React, { useMemo } from 'react';
import { Tag, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTagStore } from '@/stores/tagStore';
import { DbTag } from '@/types/database.types';

interface PopularTagsProps {
    /** Maximum number of tags to show */
    maxTags?: number;
    /** Called when a tag is clicked */
    onTagClick?: (tag: DbTag) => void;
}

export function PopularTags({ maxTags = 15, onTagClick }: PopularTagsProps) {
    const { tags } = useTagStore();

    // Get top tags by usage
    const popularTags = useMemo(() => {
        return [...tags]
            .filter(t => (t.template_count || 0) > 0)
            .sort((a, b) => (b.template_count || 0) - (a.template_count || 0))
            .slice(0, maxTags);
    }, [tags, maxTags]);

    // Calculate font size based on usage
    const getFontSize = (count: number): string => {
        if (popularTags.length === 0) return 'text-sm';
        
        const maxCount = popularTags[0].template_count || 1;
        const ratio = count / maxCount;
        
        if (ratio > 0.8) return 'text-lg font-semibold';
        if (ratio > 0.5) return 'text-base font-medium';
        if (ratio > 0.3) return 'text-sm';
        return 'text-xs';
    };

    if (popularTags.length === 0) {
        return null; // Don't show if no popular tags
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    Popular Tags
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                    Most used tags based on template count
                </p>
            </div>

            {/* Tag Cloud */}
            <div className="p-4">
                <div className="flex flex-wrap gap-2">
                    {popularTags.map((tag) => (
                        <button
                            key={tag.id}
                            onClick={() => onTagClick?.(tag)}
                            className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full transition-all",
                                "bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700",
                                getFontSize(tag.template_count || 0)
                            )}
                        >
                            <Tag className="w-3 h-3" />
                            {tag.name}
                            <span className="text-xs text-gray-500 ml-0.5">
                                ({tag.template_count})
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default PopularTags;
