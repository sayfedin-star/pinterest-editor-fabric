/**
 * Category Form Component
 * 
 * Modal form for creating and editing categories.
 * Includes name, description, icon picker, and color picker.
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
    X, Loader2, Folder, Tag, ShoppingBag, Image as ImageIcon,
    FileText, Sparkles, Heart, Star, Zap, Coffee, Camera,
    Music, Film, Book, Gift, Palette, Feather, Globe,
    Home, Briefcase, Trophy, Target, Rocket
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCategoryStore } from '@/stores/categoryStore';
import { DbCategory } from '@/types/database.types';

// ============================================
// Available Icons
// ============================================

const AVAILABLE_ICONS = [
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

interface CategoryFormProps {
    /** Open state */
    isOpen: boolean;
    /** Close handler */
    onClose: () => void;
    /** Category to edit (null for create) */
    category?: DbCategory | null;
    /** Called after successful save */
    onSaved?: (category: DbCategory) => void;
}

// ============================================
// Category Form Component
// ============================================

export function CategoryForm({
    isOpen,
    onClose,
    category,
    onSaved,
}: CategoryFormProps) {
    const { addCategory, editCategory } = useCategoryStore();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('Folder');
    const [selectedColor, setSelectedColor] = useState('#3b82f6');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isEditing = !!category;

    // Initialize form when category changes
    useEffect(() => {
        if (category) {
            setName(category.name);
            setDescription(category.description || '');
            setSelectedIcon(category.icon || 'Folder');
            setSelectedColor(category.color || '#3b82f6');
        } else {
            // Reset for new category
            setName('');
            setDescription('');
            setSelectedIcon('Folder');
            setSelectedColor('#3b82f6');
        }
        setError(null);
    }, [category, isOpen]);

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!name.trim()) {
            setError('Category name is required');
            return;
        }

        setIsSaving(true);

        try {
            const data = {
                name: name.trim(),
                description: description.trim() || undefined,
                icon: selectedIcon,
                color: selectedColor,
            };

            let result: DbCategory | null;

            if (isEditing && category) {
                result = await editCategory(category.id, data);
            } else {
                result = await addCategory(data);
            }

            if (result) {
                onSaved?.(result);
                onClose();
            } else {
                setError('Failed to save category');
            }
        } catch (err) {
            console.error('Error saving category:', err);
            setError('An error occurred while saving');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {isEditing ? 'Edit Category' : 'Create Category'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Error Message */}
                    {error && (
                        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Food Recipes"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            autoFocus
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional description..."
                            rows={2}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                        />
                    </div>

                    {/* Icon Picker */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Icon
                        </label>
                        <div className="grid grid-cols-8 gap-2">
                            {AVAILABLE_ICONS.map(({ name: iconName, component: IconComponent }) => (
                                <button
                                    key={iconName}
                                    type="button"
                                    onClick={() => setSelectedIcon(iconName)}
                                    className={cn(
                                        "p-2 rounded-lg border-2 transition-all",
                                        selectedIcon === iconName
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-transparent hover:bg-gray-100"
                                    )}
                                    title={iconName}
                                >
                                    <IconComponent 
                                        className="w-5 h-5"
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
                                    className={cn(
                                        "w-8 h-8 rounded-full transition-all",
                                        selectedColor === color
                                            ? "ring-2 ring-offset-2 ring-gray-400 scale-110"
                                            : "hover:scale-110"
                                    )}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Preview
                        </label>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: `${selectedColor}20` }}
                            >
                                {(() => {
                                    const IconComponent = AVAILABLE_ICONS.find(i => i.name === selectedIcon)?.component || Folder;
                                    return <IconComponent className="w-5 h-5" style={{ color: selectedColor }} />;
                                })()}
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">
                                    {name || 'Category Name'}
                                </p>
                                {description && (
                                    <p className="text-sm text-gray-500 truncate max-w-[200px]">
                                        {description}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className={cn(
                                "px-5 py-2 text-sm font-medium text-white rounded-lg transition-all",
                                "bg-blue-600 hover:bg-blue-700",
                                "disabled:opacity-50 disabled:cursor-not-allowed",
                                "flex items-center gap-2"
                            )}
                        >
                            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isEditing ? 'Save Changes' : 'Create Category'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CategoryForm;
