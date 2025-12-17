/**
 * Category List Component
 * 
 * Displays a list of user's categories with edit/delete actions.
 * Used in the template management sidebar and category management page.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { 
    Folder, Pencil, Trash2, Loader2, 
    AlertCircle, FolderOpen,
    ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCategoryStore } from '@/stores/categoryStore';
import { DbCategory } from '@/types/database.types';

// ============================================
// Lucide Icon Mapping
// ============================================

// Map icon names to Lucide components
import * as LucideIcons from 'lucide-react';

type IconComponent = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

function getIconComponent(iconName: string | null): IconComponent {
    if (!iconName) return Folder;
    
    // Convert icon name to PascalCase for Lucide lookup
    const pascalCase = iconName.replace(/(^|-)([a-z])/g, (_, __, char) => char.toUpperCase());
    const icons = LucideIcons as unknown as Record<string, IconComponent | undefined>;
    const IconComponent = icons[pascalCase];
    
    return IconComponent || Folder;
}

// ============================================
// Component Props
// ============================================

interface CategoryListProps {
    /** Called when a category is selected */
    onSelect?: (category: DbCategory) => void;
    /** Called when edit is clicked */
    onEdit?: (category: DbCategory) => void;
    /** Called when delete is confirmed */
    onDelete?: (category: DbCategory) => void;
    /** Currently selected category ID */
    selectedId?: string | null;
    /** Whether to show template counts */
    showCounts?: boolean;
    /** Optional className */
    className?: string;
    /** Compact mode for sidebar use */
    compact?: boolean;
}

// ============================================
// Category List Component
// ============================================

export function CategoryList({
    onSelect,
    onEdit,
    onDelete,
    selectedId,
    showCounts = true,
    className,
    compact = false,
}: CategoryListProps) {
    const { 
        categories, 
        isLoading, 
        error, 
        fetchCategories,
        hasFetched,
    } = useCategoryStore();

    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    // Fetch categories on mount
    useEffect(() => {
        if (!hasFetched) {
            fetchCategories(showCounts);
        }
    }, [hasFetched, fetchCategories, showCounts]);

    // Close menu when clicking outside
    useEffect(() => {
        if (!menuOpenId && !deleteConfirmId) return;
        
        const handleClickOutside = () => {
            setMenuOpenId(null);
            setDeleteConfirmId(null);
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [menuOpenId, deleteConfirmId]);

    // Handle delete confirmation
    const handleDeleteClick = (e: React.MouseEvent, category: DbCategory) => {
        e.stopPropagation();
        if (deleteConfirmId === category.id) {
            // Already confirming - execute delete
            onDelete?.(category);
            setDeleteConfirmId(null);
        } else {
            // Show confirmation
            setDeleteConfirmId(category.id);
            setMenuOpenId(null);
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
                    onClick={() => fetchCategories(showCounts)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                    Try again
                </button>
            </div>
        );
    }

    // Empty state
    if (categories.length === 0) {
        return (
            <div className={cn("flex flex-col items-center justify-center py-8 text-center", className)}>
                <FolderOpen className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500 mb-1">No categories yet</p>
                <p className="text-xs text-gray-400">Create a category to organize your templates</p>
            </div>
        );
    }

    return (
        <div className={cn("space-y-1", className)}>
            {categories.map((category) => {
                const IconComponent = getIconComponent(category.icon);
                const isSelected = selectedId === category.id;
                const isConfirmingDelete = deleteConfirmId === category.id;

                return (
                    <div
                        key={category.id}
                        className={cn(
                            "group relative flex items-center gap-3 rounded-lg transition-all cursor-pointer",
                            compact ? "px-3 py-2" : "px-4 py-3",
                            isSelected
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "hover:bg-gray-50 border border-transparent",
                            isConfirmingDelete && "ring-2 ring-red-200 bg-red-50"
                        )}
                        onClick={() => onSelect?.(category)}
                    >
                        {/* Icon */}
                        <div
                            className={cn(
                                "flex-shrink-0 rounded-lg flex items-center justify-center",
                                compact ? "w-8 h-8" : "w-10 h-10"
                            )}
                            style={{
                                backgroundColor: category.color 
                                    ? `${category.color}20` 
                                    : 'rgb(243, 244, 246)',
                            }}
                        >
                            <IconComponent 
                                className={cn(
                                    compact ? "w-4 h-4" : "w-5 h-5"
                                )}
                                style={{ color: category.color || '#6b7280' }}
                            />
                        </div>

                        {/* Name & Count */}
                        <div className="flex-1 min-w-0">
                            <p className={cn(
                                "font-medium truncate",
                                compact ? "text-sm" : "text-base",
                                isSelected ? "text-blue-700" : "text-gray-900"
                            )}>
                                {category.name}
                            </p>
                            {showCounts && category.template_count !== undefined && (
                                <p className="text-xs text-gray-500">
                                    {category.template_count} template{category.template_count !== 1 ? 's' : ''}
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
                                    onClick={(e) => handleDeleteClick(e, category)}
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

                        {/* Actions Menu */}
                        {!isConfirmingDelete && (onEdit || onDelete) && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {onEdit && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit(category);
                                        }}
                                        className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700"
                                        title="Edit category"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        onClick={(e) => handleDeleteClick(e, category)}
                                        className="p-1.5 rounded hover:bg-red-100 text-gray-500 hover:text-red-600"
                                        title="Delete category"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Chevron */}
                        {onSelect && !compact && (
                            <ChevronRight className={cn(
                                "w-4 h-4 text-gray-400 transition-transform",
                                isSelected && "transform rotate-90"
                            )} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default CategoryList;
