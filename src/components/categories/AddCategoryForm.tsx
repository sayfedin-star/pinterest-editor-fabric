/**
 * Add Category Form (WordPress-style Sidebar)
 * 
 * Sticky sidebar form for creating and editing categories.
 * Matches WordPress admin interface patterns.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Folder, Tag, ShoppingBag, Image as ImageIcon,
    FileText, Sparkles, Heart, Star, Zap, Coffee, Camera,
    Music, Film, Book, Gift, Palette, Feather, Globe,
    Home, Briefcase, Trophy, Target, Rocket, Loader2,
    LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCategoryStore } from '@/stores/categoryStore';
import { DbCategory } from '@/types/database.types';

// ============================================
// Available Icons
// ============================================

const AVAILABLE_ICONS: { name: string; component: LucideIcon }[] = [
    { name: 'Folder', component: Folder },
    { name: 'Tag', component: Tag },
    { name: 'ShoppingBag', component: ShoppingBag },
    { name: 'Image', component: ImageIcon },
    { name: 'FileText', component: FileText },
    { name: 'Sparkles', component: Sparkles },
    { name: 'Heart', component: Heart },
    { name: 'Star', component: Star },
    { name: 'Zap', component: Zap },
    { name: 'Coffee', component: Coffee },
    { name: 'Camera', component: Camera },
    { name: 'Music', component: Music },
    { name: 'Film', component: Film },
    { name: 'Book', component: Book },
    { name: 'Gift', component: Gift },
    { name: 'Palette', component: Palette },
    { name: 'Feather', component: Feather },
    { name: 'Globe', component: Globe },
    { name: 'Home', component: Home },
    { name: 'Briefcase', component: Briefcase },
    { name: 'Trophy', component: Trophy },
    { name: 'Target', component: Target },
    { name: 'Rocket', component: Rocket },
];

// ============================================
// Available Colors
// ============================================

const AVAILABLE_COLORS = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#a855f7', // purple
    '#ec4899', // pink
    '#6b7280', // gray
];

// ============================================
// Component Props
// ============================================

interface AddCategoryFormProps {
    /** Category to edit (null for create mode) */
    editingCategory?: DbCategory | null;
    /** Called when edit is cancelled */
    onCancelEdit?: () => void;
    /** Called after successful save */
    onSaved?: () => void;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Generate URL-safe slug from name
 */
function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// ============================================
// Component
// ============================================

export function AddCategoryForm({
    editingCategory,
    onCancelEdit,
    onSaved,
}: AddCategoryFormProps) {
    const { addCategory, editCategory } = useCategoryStore();

    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('Folder');
    const [selectedColor, setSelectedColor] = useState('#3b82f6');
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

    const isEditMode = !!editingCategory;

    // Reset form to default values
    const resetForm = useCallback(() => {
        setName('');
        setSlug('');
        setDescription('');
        setSelectedIcon('Folder');
        setSelectedColor('#3b82f6');
        setErrors({});
        setSlugManuallyEdited(false);
    }, []);

    // Populate form when editing
    useEffect(() => {
        if (editingCategory) {
            setName(editingCategory.name);
            setSlug(editingCategory.slug);
            setDescription(editingCategory.description || '');
            setSelectedIcon(editingCategory.icon || 'Folder');
            setSelectedColor(editingCategory.color || '#3b82f6');
            setSlugManuallyEdited(true); // Don't auto-generate for edits
        } else {
            resetForm();
        }
    }, [editingCategory, resetForm]);

    // Auto-generate slug from name
    useEffect(() => {
        if (!slugManuallyEdited && name) {
            setSlug(generateSlug(name));
        }
    }, [name, slugManuallyEdited]);

    // Validate form
    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!name.trim()) {
            newErrors.name = 'Name is required';
        } else if (name.trim().length > 100) {
            newErrors.name = 'Name must be 100 characters or less';
        }

        if (!slug.trim()) {
            newErrors.slug = 'Slug is required';
        } else if (!/^[a-z0-9-]+$/.test(slug)) {
            newErrors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens';
        }

        if (description.length > 500) {
            newErrors.description = 'Description must be 500 characters or less';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        setIsSaving(true);

        try {
            const data = {
                name: name.trim(),
                slug: slug.trim(),
                description: description.trim() || undefined,
                icon: selectedIcon,
                color: selectedColor,
            };

            let result: DbCategory | null;

            if (isEditMode && editingCategory) {
                result = await editCategory(editingCategory.id, data);
            } else {
                result = await addCategory(data);
            }

            if (result) {
                resetForm();
                onSaved?.();
                onCancelEdit?.();
            }
        } finally {
            setIsSaving(false);
        }
    };

    // Handle cancel
    const handleCancel = () => {
        resetForm();
        onCancelEdit?.();
    };

    return (
        <div className={cn(
            "bg-white rounded-xl border border-gray-200 overflow-hidden",
            isEditMode && "ring-2 ring-blue-500"
        )}>
            {/* Header */}
            <div className={cn(
                "px-5 py-4 border-b",
                isEditMode ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
            )}>
                <h2 className="font-semibold text-gray-900">
                    {isEditMode ? 'Edit Category' : 'Add New Category'}
                </h2>
                {isEditMode && (
                    <p className="text-sm text-blue-600 mt-0.5">
                        Editing: {editingCategory?.name}
                    </p>
                )}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-5">
                {/* Name */}
                <div>
                    <label htmlFor="category-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="category-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Food Recipes"
                        disabled={isSaving}
                        className={cn(
                            "w-full px-3 py-2 border rounded-lg text-sm transition-all",
                            "focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                            "disabled:bg-gray-50 disabled:cursor-not-allowed",
                            errors.name ? "border-red-300 bg-red-50" : "border-gray-300"
                        )}
                    />
                    {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                        The name is how it appears on your site.
                    </p>
                </div>

                {/* Slug */}
                <div>
                    <label htmlFor="category-slug" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Slug <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="category-slug"
                        type="text"
                        value={slug}
                        onChange={(e) => {
                            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                            setSlugManuallyEdited(true);
                        }}
                        placeholder="e.g., food-recipes"
                        disabled={isSaving}
                        className={cn(
                            "w-full px-3 py-2 border rounded-lg text-sm transition-all font-mono",
                            "focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                            "disabled:bg-gray-50 disabled:cursor-not-allowed",
                            errors.slug ? "border-red-300 bg-red-50" : "border-gray-300"
                        )}
                    />
                    {errors.slug && (
                        <p className="mt-1 text-sm text-red-600">{errors.slug}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                        The &quot;slug&quot; is the URL-friendly version of the name.
                    </p>
                </div>

                {/* Description */}
                <div>
                    <label htmlFor="category-description" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Description
                    </label>
                    <textarea
                        id="category-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Optional description..."
                        rows={3}
                        disabled={isSaving}
                        className={cn(
                            "w-full px-3 py-2 border rounded-lg text-sm transition-all resize-none",
                            "focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                            "disabled:bg-gray-50 disabled:cursor-not-allowed",
                            errors.description ? "border-red-300 bg-red-50" : "border-gray-300"
                        )}
                    />
                    {errors.description && (
                        <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                        {description.length}/500 characters
                    </p>
                </div>

                {/* Icon Picker */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Icon
                    </label>
                    <div className="grid grid-cols-8 gap-1.5">
                        {AVAILABLE_ICONS.map(({ name: iconName, component: IconComponent }) => (
                            <button
                                key={iconName}
                                type="button"
                                onClick={() => setSelectedIcon(iconName)}
                                disabled={isSaving}
                                className={cn(
                                    "p-2 rounded-lg border-2 transition-all",
                                    "hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed",
                                    selectedIcon === iconName
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-transparent"
                                )}
                                title={iconName}
                            >
                                <IconComponent 
                                    className="w-4 h-4"
                                    style={{ color: selectedColor }}
                                />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Color Picker */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {AVAILABLE_COLORS.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => setSelectedColor(color)}
                                disabled={isSaving}
                                className={cn(
                                    "w-7 h-7 rounded-full transition-all",
                                    "disabled:opacity-50 disabled:cursor-not-allowed",
                                    selectedColor === color
                                        ? "ring-2 ring-offset-2 ring-gray-400 scale-110"
                                        : "hover:scale-110"
                                )}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-all",
                            "bg-blue-600 hover:bg-blue-700",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                    >
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isEditMode ? 'Update Category' : 'Add New Category'}
                    </button>
                    {isEditMode && (
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={isSaving}
                            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}

export default AddCategoryForm;
