/**
 * Categories Table Component (WordPress-style)
 * 
 * Full data table with columns, sorting, search, and bulk actions.
 * Matches WordPress admin table patterns.
 */

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
    Search, ChevronDown, ChevronUp, Trash2, Loader2,
    Folder, AlertCircle, FolderOpen,
    Pencil, LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCategoryStore } from '@/stores/categoryStore';
import { DbCategory } from '@/types/database.types';
import { toast } from 'sonner';
import * as LucideIcons from 'lucide-react';

// ============================================
// Icon Helper
// ============================================

function getIconComponent(iconName: string | null): LucideIcon {
    if (!iconName) return Folder;
    const pascalCase = iconName.replace(/(^|-)([a-z])/g, (_, __, char) => char.toUpperCase());
    const icons = LucideIcons as unknown as Record<string, LucideIcon | undefined>;
    return icons[pascalCase] || Folder;
}

// ============================================
// Types
// ============================================

type SortField = 'name' | 'template_count' | 'created_at';
type SortDirection = 'asc' | 'desc';

interface CategoriesTableProps {
    /** Called when edit is clicked */
    onEdit?: (category: DbCategory) => void;
}

// ============================================
// Component
// ============================================

export function CategoriesTable({ onEdit }: CategoriesTableProps) {
    const {
        categories,
        isLoading,
        error,
        fetchCategories,
        removeCategory,
        hasFetched,
    } = useCategoryStore();

    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkAction, setBulkAction] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState<Set<string>>(new Set());

    // Fetch on mount
    useEffect(() => {
        if (!hasFetched) {
            fetchCategories(true);
        }
    }, [hasFetched, fetchCategories]);

    // Filter and sort categories
    const filteredCategories = useMemo(() => {
        let result = [...categories];

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(cat =>
                cat.name.toLowerCase().includes(query) ||
                cat.slug.toLowerCase().includes(query) ||
                (cat.description?.toLowerCase().includes(query))
            );
        }

        // Sort
        result.sort((a, b) => {
            let aVal: string | number = '';
            let bVal: string | number = '';

            switch (sortField) {
                case 'name':
                    aVal = a.name.toLowerCase();
                    bVal = b.name.toLowerCase();
                    break;
                case 'template_count':
                    aVal = a.template_count || 0;
                    bVal = b.template_count || 0;
                    break;
                case 'created_at':
                    aVal = a.created_at || '';
                    bVal = b.created_at || '';
                    break;
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [categories, searchQuery, sortField, sortDirection]);

    // Handle sort
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // Handle select all
    const handleSelectAll = () => {
        if (selectedIds.size === filteredCategories.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredCategories.map(c => c.id)));
        }
    };

    // Handle row select
    const handleSelectRow = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    // Handle single delete
    const handleDelete = async (category: DbCategory) => {
        setPendingDelete(prev => new Set(prev).add(category.id));
        setShowDeleteConfirm(null);

        try {
            await removeCategory(category.id);
            setSelectedIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(category.id);
                return newSet;
            });
        } finally {
            setPendingDelete(prev => {
                const newSet = new Set(prev);
                newSet.delete(category.id);
                return newSet;
            });
        }
    };

    // Handle bulk action
    const handleBulkAction = async () => {
        if (bulkAction !== 'delete' || selectedIds.size === 0) return;

        const confirmed = window.confirm(
            `Are you sure you want to delete ${selectedIds.size} ${selectedIds.size === 1 ? 'category' : 'categories'}? This action cannot be undone.`
        );

        if (!confirmed) return;

        setIsDeleting(true);
        const idsToDelete = Array.from(selectedIds);

        // Mark all as pending
        setPendingDelete(new Set(idsToDelete));

        let successCount = 0;
        let failCount = 0;

        for (const id of idsToDelete) {
            const success = await removeCategory(id);
            if (success) {
                successCount++;
            } else {
                failCount++;
            }
        }

        // Clear state
        setPendingDelete(new Set());
        setSelectedIds(new Set());
        setBulkAction('');
        setIsDeleting(false);

        // Show result
        if (failCount > 0) {
            toast.error(`Deleted ${successCount}, failed ${failCount}`);
        } else {
            toast.success(`Deleted ${successCount} ${successCount === 1 ? 'category' : 'categories'}`);
        }
    };

    // Render sort icon
    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return null;
        return sortDirection === 'asc' 
            ? <ChevronUp className="w-4 h-4" />
            : <ChevronDown className="w-4 h-4" />;
    };

    // Loading state
    if (isLoading && !hasFetched) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-12 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load categories</h3>
                <p className="text-gray-500 mb-4">{error}</p>
                <button
                    onClick={() => fetchCategories(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    const isAllSelected = filteredCategories.length > 0 && selectedIds.size === filteredCategories.length;
    const isSomeSelected = selectedIds.size > 0 && selectedIds.size < filteredCategories.length;

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Table Header */}
            <div className="px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Bulk Actions */}
                <div className="flex items-center gap-2">
                    <select
                        value={bulkAction}
                        onChange={(e) => setBulkAction(e.target.value)}
                        disabled={selectedIds.size === 0 || isDeleting}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white disabled:bg-gray-50 disabled:cursor-not-allowed"
                    >
                        <option value="">Bulk Actions</option>
                        <option value="delete">Delete</option>
                    </select>
                    <button
                        onClick={handleBulkAction}
                        disabled={!bulkAction || selectedIds.size === 0 || isDeleting}
                        className={cn(
                            "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                            "bg-gray-100 text-gray-700 hover:bg-gray-200",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                    >
                        {isDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            'Apply'
                        )}
                    </button>
                    {selectedIds.size > 0 && (
                        <span className="text-sm text-gray-500">
                            {selectedIds.size} selected
                        </span>
                    )}
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search categories..."
                        className="pl-9 pr-4 py-1.5 text-sm border border-gray-300 rounded-lg w-full sm:w-64 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="w-10 px-4 py-3">
                                <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    ref={el => {
                                        if (el) el.indeterminate = isSomeSelected;
                                    }}
                                    onChange={handleSelectAll}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                            </th>
                            <th className="px-4 py-3 text-left">
                                <button
                                    onClick={() => handleSort('name')}
                                    className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                                >
                                    Name
                                    <SortIcon field="name" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left hidden md:table-cell">
                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Description
                                </span>
                            </th>
                            <th className="px-4 py-3 text-left hidden sm:table-cell">
                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Slug
                                </span>
                            </th>
                            <th className="px-4 py-3 text-left">
                                <button
                                    onClick={() => handleSort('template_count')}
                                    className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                                >
                                    Count
                                    <SortIcon field="template_count" />
                                </button>
                            </th>
                            <th className="w-24 px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredCategories.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center">
                                    {categories.length === 0 ? (
                                        <div className="flex flex-col items-center">
                                            <FolderOpen className="w-12 h-12 text-gray-300 mb-4" />
                                            <h3 className="text-lg font-medium text-gray-900 mb-1">No categories yet</h3>
                                            <p className="text-gray-500">Create your first category to organize templates.</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <Search className="w-12 h-12 text-gray-300 mb-4" />
                                            <h3 className="text-lg font-medium text-gray-900 mb-1">No results found</h3>
                                            <p className="text-gray-500">Try a different search term.</p>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ) : (
                            filteredCategories.map((category) => {
                                const IconComponent = getIconComponent(category.icon);
                                const isSelected = selectedIds.has(category.id);
                                const isPending = pendingDelete.has(category.id);
                                const isConfirmingDelete = showDeleteConfirm === category.id;

                                return (
                                    <tr
                                        key={category.id}
                                        className={cn(
                                            "group transition-colors",
                                            isSelected && "bg-blue-50",
                                            isPending && "opacity-50 pointer-events-none"
                                        )}
                                    >
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleSelectRow(category.id)}
                                                disabled={isPending}
                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                                    style={{
                                                        backgroundColor: category.color
                                                            ? `${category.color}20`
                                                            : 'rgb(243, 244, 246)',
                                                    }}
                                                >
                                                    <IconComponent
                                                        className="w-4 h-4"
                                                        style={{ color: category.color || '#6b7280' }}
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-gray-900 truncate">
                                                        {category.name}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            <p className="text-sm text-gray-500 truncate max-w-xs">
                                                {category.description || '—'}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 hidden sm:table-cell">
                                            <code className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                                {category.slug}
                                            </code>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-gray-500">
                                                {(category.template_count || 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {isConfirmingDelete ? (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleDelete(category)}
                                                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                                    >
                                                        Delete
                                                    </button>
                                                    <button
                                                        onClick={() => setShowDeleteConfirm(null)}
                                                        className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => onEdit?.(category)}
                                                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setShowDeleteConfirm(category.id)}
                                                        className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            {filteredCategories.length > 0 && (
                <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 text-sm text-gray-500">
                    {filteredCategories.length} {filteredCategories.length === 1 ? 'item' : 'items'}
                    {searchQuery && ` (filtered from ${categories.length})`}
                </div>
            )}
        </div>
    );
}

export default CategoriesTable;
