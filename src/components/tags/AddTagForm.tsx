/**
 * Add Tag Form (WordPress-style Sidebar)
 * 
 * Simpler than AddCategoryForm - no icon or color pickers.
 * Just name, slug, and description.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTagStore } from '@/stores/tagStore';
import { DbTag } from '@/types/database.types';

// ============================================
// Component Props
// ============================================

interface AddTagFormProps {
    /** Tag to edit (null for create mode) */
    editingTag?: DbTag | null;
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

export function AddTagForm({
    editingTag,
    onCancelEdit,
    onSaved,
}: AddTagFormProps) {
    const { addTag, editTag } = useTagStore();

    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

    const isEditMode = !!editingTag;

    // Reset form to default values
    const resetForm = useCallback(() => {
        setName('');
        setSlug('');
        setDescription('');
        setErrors({});
        setSlugManuallyEdited(false);
    }, []);

    // Populate form when editing
    useEffect(() => {
        if (editingTag) {
            setName(editingTag.name);
            setSlug(editingTag.slug);
            setDescription(editingTag.description || '');
            setSlugManuallyEdited(true);
        } else {
            resetForm();
        }
    }, [editingTag, resetForm]);

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
            };

            let result: DbTag | null;

            if (isEditMode && editingTag) {
                result = await editTag(editingTag.id, data);
            } else {
                result = await addTag(data);
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
                    {isEditMode ? 'Edit Tag' : 'Add New Tag'}
                </h2>
                {isEditMode && (
                    <p className="text-sm text-blue-600 mt-0.5">
                        Editing: {editingTag?.name}
                    </p>
                )}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-5">
                {/* Name */}
                <div>
                    <label htmlFor="tag-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="tag-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Summer 2025"
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
                    <label htmlFor="tag-slug" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Slug <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="tag-slug"
                        type="text"
                        value={slug}
                        onChange={(e) => {
                            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                            setSlugManuallyEdited(true);
                        }}
                        placeholder="e.g., summer-2025"
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
                    <label htmlFor="tag-description" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Description
                    </label>
                    <textarea
                        id="tag-description"
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
                        {isEditMode ? 'Update Tag' : 'Add New Tag'}
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

export default AddTagForm;
