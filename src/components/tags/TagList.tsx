/**
 * Tag List Component
 * 
 * Displays a list of user's tags with edit/delete actions.
 * Used in the template management sidebar and tag management page.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { 
    Tag, Pencil, Trash2, Loader2, 
    AlertCircle, Tags
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTagStore } from '@/stores/tagStore';
import { DbTag } from '@/types/database.types';

// ============================================
// Component Props
// ============================================

interface TagListProps {
    /** Called when a tag is selected */
    onSelect?: (tag: DbTag) => void;
    /** Called when edit is clicked */
    onEdit?: (tag: DbTag) => void;
    /** Called when delete is confirmed */
    onDelete?: (tag: DbTag) => void;
    /** Currently selected tag IDs (for multi-select mode) */
    selectedIds?: string[];
    /** Whether to show template counts */
    showCounts?: boolean;
    /** Optional className */
    className?: string;
    /** Display mode: list or chips */
    mode?: 'list' | 'chips';
    /** Maximum tags to show (for chips mode) */
    maxVisible?: number;
}

// ============================================
// Tag List Component
// ============================================

export function TagList({
    onSelect,
    onEdit,
    onDelete,
    selectedIds = [],
    showCounts = false,
    className,
    mode = 'list',
    maxVisible,
}: TagListProps) {
    const { 
        tags, 
        isLoading, 
        error, 
        fetchTags,
        hasFetched,
    } = useTagStore();

    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [showAll, setShowAll] = useState(false);

    // Fetch tags on mount
    useEffect(() => {
        if (!hasFetched) {
            fetchTags(showCounts);
        }
    }, [hasFetched, fetchTags, showCounts]);

    // Close confirmation when clicking outside
    useEffect(() => {
        if (!deleteConfirmId) return;
        const handleClickOutside = () => setDeleteConfirmId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [deleteConfirmId]);

    // Handle delete confirmation
    const handleDeleteClick = (e: React.MouseEvent, tag: DbTag) => {
        e.stopPropagation();
        if (deleteConfirmId === tag.id) {
            onDelete?.(tag);
            setDeleteConfirmId(null);
        } else {
            setDeleteConfirmId(tag.id);
        }
    };

    // Loading state
    if (isLoading && !hasFetched) {
        return (
            <div className={cn("flex items-center justify-center py-8", className)}>
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className={cn("flex flex-col items-center justify-center py-8 text-center", className)}>
                <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
                <p className="text-sm text-gray-600">{error}</p>
                <button
                    onClick={() => fetchTags(showCounts)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                    Try again
                </button>
            </div>
        );
    }

    // Empty state
    if (tags.length === 0) {
        return (
            <div className={cn("flex flex-col items-center justify-center py-8 text-center", className)}>
                <Tags className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500 mb-1">No tags yet</p>
                <p className="text-xs text-gray-400">Create tags to organize your templates</p>
            </div>
        );
    }

    // Chips mode
    if (mode === 'chips') {
        const visibleTags = !showAll && maxVisible ? tags.slice(0, maxVisible) : tags;
        const hiddenCount = tags.length - visibleTags.length;

        return (
            <div className={cn("flex flex-wrap gap-2", className)}>
                {visibleTags.map((tag) => {
                    const isSelected = selectedIds.includes(tag.id);

                    return (
                        <button
                            key={tag.id}
                            onClick={() => onSelect?.(tag)}
                            className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all",
                                isSelected
                                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent"
                            )}
                        >
                            <Tag className="w-3.5 h-3.5" />
                            {tag.name}
                            {showCounts && tag.template_count !== undefined && (
                                <span className="text-xs opacity-70">({tag.template_count})</span>
                            )}
                        </button>
                    );
                })}
                {hiddenCount > 0 && !showAll && (
                    <button
                        onClick={() => setShowAll(true)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                        +{hiddenCount} more
                    </button>
                )}
                {showAll && maxVisible && tags.length > maxVisible && (
                    <button
                        onClick={() => setShowAll(false)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                        Show less
                    </button>
                )}
            </div>
        );
    }

    // List mode
    return (
        <div className={cn("space-y-1", className)}>
            {tags.map((tag) => {
                const isSelected = selectedIds.includes(tag.id);
                const isConfirmingDelete = deleteConfirmId === tag.id;

                return (
                    <div
                        key={tag.id}
                        className={cn(
                            "group relative flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer",
                            isSelected
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "hover:bg-gray-50 border border-transparent",
                            isConfirmingDelete && "ring-2 ring-red-200 bg-red-50"
                        )}
                        onClick={() => onSelect?.(tag)}
                    >
                        {/* Icon */}
                        <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Tag className="w-4 h-4 text-gray-500" />
                        </div>

                        {/* Name & Count */}
                        <div className="flex-1 min-w-0">
                            <p className={cn(
                                "text-sm font-medium truncate",
                                isSelected ? "text-blue-700" : "text-gray-900"
                            )}>
                                {tag.name}
                            </p>
                            {showCounts && tag.template_count !== undefined && (
                                <p className="text-xs text-gray-500">
                                    {tag.template_count} template{tag.template_count !== 1 ? 's' : ''}
                                </p>
                            )}
                        </div>

                        {/* Delete Confirmation */}
                        {isConfirmingDelete && (
                            <div 
                                className="flex items-center gap-2"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <span className="text-xs text-red-600">Delete?</span>
                                <button
                                    onClick={(e) => handleDeleteClick(e, tag)}
                                    className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                    Yes
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirmId(null);
                                    }}
                                    className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                >
                                    No
                                </button>
                            </div>
                        )}

                        {/* Actions */}
                        {!isConfirmingDelete && (onEdit || onDelete) && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {onEdit && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit(tag);
                                        }}
                                        className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700"
                                        title="Edit tag"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        onClick={(e) => handleDeleteClick(e, tag)}
                                        className="p-1.5 rounded hover:bg-red-100 text-gray-500 hover:text-red-600"
                                        title="Delete tag"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default TagList;
