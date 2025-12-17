/**
 * Template Metadata Panel (Simplified)
 * 
 * Editor sidebar panel for managing template's category, tags, and featured status.
 * Clean, flat design without collapsible sections for better UX.
 */

'use client';

import React, { useEffect, useState } from 'react';
import {
    Folder, Tag, Star, Save, RotateCcw, Loader2,
    ChevronDown, Check, Sparkles, ExternalLink, Plus,
    LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useTemplateMetadataStore } from '@/stores/templateMetadataStore';
import { useCategoryStore } from '@/stores/categoryStore';
import { useTemplateStore } from '@/stores/templateStore';
import { TagInput } from '@/components/tags/TagInput';
import { CategoryForm } from '@/components/categories/CategoryForm';

// ============================================
// Lucide Icon Mapping
// ============================================

import * as LucideIcons from 'lucide-react';

function getIconComponent(iconName: string | null): LucideIcon {
    if (!iconName) return Folder;
    const pascalCase = iconName.replace(/(^|-)([a-z])/g, (_, __, char) => char.toUpperCase());
    const icons = LucideIcons as unknown as Record<string, LucideIcon | undefined>;
    const Icon = icons[pascalCase];
    return Icon || Folder;
}

// ============================================
// Component
// ============================================

export function TemplateMetadataPanel() {
    const { templateId } = useTemplateStore();
    const {
        categoryId,
        tagIds,
        isFeatured,
        description,
        isLoading,
        isSaving,
        hasUnsavedChanges,
        loadMetadata,
        setCategory,
        setTags,
        toggleFeatured,
        setDescription,
        saveChanges,
        discardChanges,
    } = useTemplateMetadataStore();

    const {
        categories,
        fetchCategories,
        hasFetched: categoriesFetched,
    } = useCategoryStore();

    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [showCategoryForm, setShowCategoryForm] = useState(false);

    // Load metadata when template changes
    useEffect(() => {
        if (templateId) {
            loadMetadata(templateId);
        }
    }, [templateId, loadMetadata]);

    // Fetch categories if not loaded
    useEffect(() => {
        if (!categoriesFetched) {
            fetchCategories(true);
        }
    }, [categoriesFetched, fetchCategories]);

    // Get selected category
    const selectedCategory = categoryId
        ? categories.find(c => c.id === categoryId)
        : null;

    // Close dropdown on outside click
    useEffect(() => {
        if (!showCategoryDropdown) return;
        const handleClick = () => setShowCategoryDropdown(false);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [showCategoryDropdown]);

    // Loading state
    if (isLoading) {
        return (
            <div className="p-4 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    Template Details
                </h3>
                {hasUnsavedChanges && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                        Unsaved
                    </span>
                )}
            </div>

            {/* Category Section */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
                        <Folder className="w-3.5 h-3.5 text-blue-500" />
                        Category
                    </label>
                    <Link 
                        href="/dashboard/categories"
                        className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1"
                    >
                        Manage
                        <ExternalLink className="w-3 h-3" />
                    </Link>
                </div>
                
                <div className="relative">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowCategoryDropdown(!showCategoryDropdown);
                        }}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 border rounded-lg text-left transition-all",
                            showCategoryDropdown
                                ? "border-blue-500 ring-2 ring-blue-100"
                                : "border-gray-300 hover:border-gray-400"
                        )}
                    >
                        {selectedCategory ? (
                            <>
                                <div
                                    className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: `${selectedCategory.color || '#6b7280'}20` }}
                                >
                                    {(() => {
                                        const Icon = getIconComponent(selectedCategory.icon);
                                        return <Icon className="w-3.5 h-3.5" style={{ color: selectedCategory.color || '#6b7280' }} />;
                                    })()}
                                </div>
                                <span className="flex-1 text-sm text-gray-900 truncate">
                                    {selectedCategory.name}
                                </span>
                            </>
                        ) : (
                            <>
                                <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center shrink-0">
                                    <Folder className="w-3.5 h-3.5 text-gray-400" />
                                </div>
                                <span className="flex-1 text-sm text-gray-500">
                                    Select category...
                                </span>
                            </>
                        )}
                        <ChevronDown className={cn(
                            "w-4 h-4 text-gray-400 transition-transform shrink-0",
                            showCategoryDropdown && "rotate-180"
                        )} />
                    </button>

                    {/* Category Dropdown */}
                    {showCategoryDropdown && (
                        <div 
                            className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* No category option */}
                            <button
                                onClick={() => {
                                    setCategory(null);
                                    setShowCategoryDropdown(false);
                                }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors",
                                    !categoryId && "bg-blue-50"
                                )}
                            >
                                <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center">
                                    <Folder className="w-3.5 h-3.5 text-gray-400" />
                                </div>
                                <span className="flex-1 text-sm text-gray-600">Uncategorized</span>
                                {!categoryId && <Check className="w-4 h-4 text-blue-600" />}
                            </button>

                            {categories.length > 0 && <hr className="border-gray-100" />}

                            {/* Categories list */}
                            {categories.length === 0 ? (
                                <div className="px-3 py-4 text-center text-sm text-gray-500">
                                    No categories yet.
                                    <button
                                        onClick={() => {
                                            setShowCategoryDropdown(false);
                                            setShowCategoryForm(true);
                                        }}
                                        className="block mx-auto mt-2 text-blue-600 hover:underline"
                                    >
                                        Create your first category
                                    </button>
                                </div>
                            ) : (
                                categories.map((cat) => {
                                    const Icon = getIconComponent(cat.icon);
                                    const isSelected = categoryId === cat.id;

                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => {
                                                setCategory(cat.id);
                                                setShowCategoryDropdown(false);
                                            }}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors",
                                                isSelected && "bg-blue-50"
                                            )}
                                        >
                                            <div
                                                className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                                                style={{ backgroundColor: `${cat.color || '#6b7280'}20` }}
                                            >
                                                <Icon className="w-3.5 h-3.5" style={{ color: cat.color || '#6b7280' }} />
                                            </div>
                                            <span className="flex-1 text-sm text-gray-900 truncate">
                                                {cat.name}
                                            </span>
                                            {cat.template_count !== undefined && cat.template_count > 0 && (
                                                <span className="text-xs text-gray-400">
                                                    {cat.template_count}
                                                </span>
                                            )}
                                            {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                                        </button>
                                    );
                                })
                            )}

                            {/* Create new */}
                            <hr className="border-gray-100" />
                            <button
                                onClick={() => {
                                    setShowCategoryDropdown(false);
                                    setShowCategoryForm(true);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-blue-50 transition-colors text-blue-600"
                            >
                                <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center">
                                    <Plus className="w-3.5 h-3.5 text-blue-600" />
                                </div>
                                <span className="text-sm font-medium">Create new category...</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Tags Section */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-green-500" />
                        Tags
                        {tagIds.length > 0 && (
                            <span className="text-gray-400 font-normal">({tagIds.length})</span>
                        )}
                    </label>
                    <Link 
                        href="/dashboard/tags"
                        className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1"
                    >
                        Manage
                        <ExternalLink className="w-3 h-3" />
                    </Link>
                </div>
                <TagInput
                    selectedIds={tagIds}
                    onChange={setTags}
                    placeholder="Add tags..."
                    allowCreate={true}
                />
            </div>

            {/* Featured Toggle */}
            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                    <Star className={cn(
                        "w-4 h-4",
                        isFeatured ? "text-amber-500 fill-amber-500" : "text-gray-400"
                    )} />
                    <span className="text-sm text-gray-700">Featured Template</span>
                </div>
                <button
                    onClick={toggleFeatured}
                    className={cn(
                        "relative w-10 h-5 rounded-full transition-colors",
                        isFeatured ? "bg-blue-600" : "bg-gray-300"
                    )}
                    role="switch"
                    aria-checked={isFeatured}
                >
                    <span
                        className={cn(
                            "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow",
                            isFeatured && "translate-x-5"
                        )}
                    />
                </button>
            </div>

            {/* Description */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    Description
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional template description..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
                <p className="text-xs text-gray-400 text-right">
                    {description.length}/500
                </p>
            </div>

            {/* Action Buttons */}
            {hasUnsavedChanges && (
                <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                    <button
                        onClick={saveChanges}
                        disabled={isSaving}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all",
                            "bg-blue-600 hover:bg-blue-700",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Save Changes
                    </button>
                    <button
                        onClick={discardChanges}
                        disabled={isSaving}
                        className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                        title="Discard changes"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Category Form Modal */}
            <CategoryForm
                isOpen={showCategoryForm}
                onClose={() => setShowCategoryForm(false)}
                onSaved={(category) => setCategory(category.id)}
            />
        </div>
    );
}

export default TemplateMetadataPanel;
