/**
 * Template Metadata Store
 * 
 * Manages template's category, tags, and featured status assignment.
 * Works alongside templateStore which handles core template data.
 * 
 * Features:
 * - Load template's current category and tags
 * - Update category (single select)
 * - Update tags (multi-select)
 * - Toggle featured status
 * - Update description
 * - Track unsaved changes
 * - Batch save all changes
 * 
 * Note: This store handles client-side metadata editing.
 * Database operations are delegated to src/lib/db/templates.ts
 */

import { create } from 'zustand';
import { toast } from 'sonner';
import { DbTag } from '@/types/database.types';
import { getTemplateTags } from '@/lib/db/tags';
import { updateTemplateMetadata, getTemplate } from '@/lib/db/templates';
import { useTemplateStore } from './templateStore';

// ============================================
// State & Actions Interfaces
// ============================================

interface TemplateMetadataState {
    /** Current template ID */
    templateId: string | null;
    /** Assigned category ID (null = uncategorized) */
    categoryId: string | null;
    /** Assigned tag IDs */
    tagIds: string[];
    /** Featured status */
    isFeatured: boolean;
    /** Template description */
    description: string;
    /** Loading state for fetch operations */
    isLoading: boolean;
    /** Saving state for update operations */
    isSaving: boolean;
    /** Error message from last failed operation */
    error: string | null;
    /** Tracks if there are unsaved changes */
    hasUnsavedChanges: boolean;
    /** Original values for reset/cancel */
    _original: {
        categoryId: string | null;
        tagIds: string[];
        isFeatured: boolean;
        description: string;
    } | null;
    /** Loaded tags for display (cached from database) */
    loadedTags: DbTag[];
}

interface TemplateMetadataActions {
    /**
     * Load metadata for a template
     * @param templateId - Template ID to load
     */
    loadMetadata: (templateId: string) => Promise<void>;

    /**
     * Set the category for the current template
     * @param categoryId - Category ID (null to remove)
     */
    setCategory: (categoryId: string | null) => void;

    /**
     * Add a tag to the current template
     * @param tagId - Tag ID to add
     */
    addTag: (tagId: string) => void;

    /**
     * Remove a tag from the current template
     * @param tagId - Tag ID to remove
     */
    removeTag: (tagId: string) => void;

    /**
     * Set all tags at once
     * @param tagIds - Array of tag IDs
     */
    setTags: (tagIds: string[]) => void;

    /**
     * Toggle the featured status
     */
    toggleFeatured: () => void;

    /**
     * Set the featured status
     * @param isFeatured - Featured status
     */
    setFeatured: (isFeatured: boolean) => void;

    /**
     * Set the description
     * @param description - Template description
     */
    setDescription: (description: string) => void;

    /**
     * Save all metadata changes to the database
     * @returns true on success, false on error
     */
    saveChanges: () => Promise<boolean>;

    /**
     * Discard unsaved changes and reset to original values
     */
    discardChanges: () => void;

    /**
     * Clear all metadata (when switching templates)
     */
    clear: () => void;

    /**
     * Clear error state
     */
    clearError: () => void;
}

// ============================================
// Initial State
// ============================================

const initialState: TemplateMetadataState = {
    templateId: null,
    categoryId: null,
    tagIds: [],
    isFeatured: false,
    description: '',
    isLoading: false,
    isSaving: false,
    error: null,
    hasUnsavedChanges: false,
    _original: null,
    loadedTags: [],
};

// ============================================
// Store Implementation
// ============================================

export const useTemplateMetadataStore = create<TemplateMetadataState & TemplateMetadataActions>((set, get) => ({
    // Initial state
    ...initialState,

    // ─────────────────────────────────────────────
    // Load Metadata
    // ─────────────────────────────────────────────

    loadMetadata: async (templateId) => {
        // Check for unsaved changes before switching
        const { hasUnsavedChanges, templateId: currentId } = get();
        if (hasUnsavedChanges && currentId && currentId !== templateId) {
            // Log warning but allow switch (UI should handle this via confirmation)
            console.warn('Switching templates with unsaved changes');
        }

        set({ isLoading: true, error: null, templateId });

        try {
            // Fetch template data and tags in parallel
            const [template, tags] = await Promise.all([
                getTemplate(templateId),
                getTemplateTags(templateId),
            ]);

            if (!template) {
                set({
                    isLoading: false,
                    error: 'Template not found',
                });
                return;
            }

            const tagIds = tags.map((t) => t.id);
            const originalValues = {
                categoryId: template.category_id || null,
                tagIds,
                isFeatured: template.is_featured || false,
                description: template.description || '',
            };

            set({
                categoryId: originalValues.categoryId,
                tagIds: originalValues.tagIds,
                isFeatured: originalValues.isFeatured,
                description: originalValues.description,
                loadedTags: tags,
                _original: originalValues,
                hasUnsavedChanges: false,
                isLoading: false,
            });
        } catch (error) {
            console.error('Error loading template metadata:', error);
            set({
                isLoading: false,
                error: 'Failed to load template metadata',
            });
            toast.error('Failed to load template metadata');
        }
    },

    // ─────────────────────────────────────────────
    // Category Management
    // ─────────────────────────────────────────────

    setCategory: (categoryId) => {
        set((state) => ({
            categoryId,
            hasUnsavedChanges: categoryId !== state._original?.categoryId,
        }));
    },

    // ─────────────────────────────────────────────
    // Tags Management
    // ─────────────────────────────────────────────

    addTag: (tagId) => {
        set((state) => {
            if (state.tagIds.includes(tagId)) {
                return state; // Already added
            }

            const newTagIds = [...state.tagIds, tagId];
            const originalTagIds = state._original?.tagIds || [];
            const hasUnsavedChanges = !arraysEqual(newTagIds, originalTagIds);

            return {
                tagIds: newTagIds,
                hasUnsavedChanges,
            };
        });
    },

    removeTag: (tagId) => {
        set((state) => {
            const newTagIds = state.tagIds.filter((id) => id !== tagId);
            const originalTagIds = state._original?.tagIds || [];
            const hasUnsavedChanges = !arraysEqual(newTagIds, originalTagIds);

            return {
                tagIds: newTagIds,
                hasUnsavedChanges,
            };
        });
    },

    setTags: (tagIds) => {
        set((state) => {
            const originalTagIds = state._original?.tagIds || [];
            const hasUnsavedChanges = !arraysEqual(tagIds, originalTagIds);

            return {
                tagIds,
                hasUnsavedChanges,
            };
        });
    },

    // ─────────────────────────────────────────────
    // Featured Status
    // ─────────────────────────────────────────────

    toggleFeatured: () => {
        set((state) => {
            const newFeatured = !state.isFeatured;
            const hasUnsavedChanges = newFeatured !== state._original?.isFeatured;

            return {
                isFeatured: newFeatured,
                hasUnsavedChanges,
            };
        });
    },

    setFeatured: (isFeatured) => {
        set((state) => ({
            isFeatured,
            hasUnsavedChanges: isFeatured !== state._original?.isFeatured,
        }));
    },

    // ─────────────────────────────────────────────
    // Description
    // ─────────────────────────────────────────────

    setDescription: (description) => {
        set((state) => ({
            description,
            hasUnsavedChanges: description !== (state._original?.description || ''),
        }));
    },

    // ─────────────────────────────────────────────
    // Save Changes
    // ─────────────────────────────────────────────

    saveChanges: async () => {
        const { templateId, categoryId, tagIds, isFeatured, description } = get();

        if (!templateId) {
            toast.error('No template selected');
            return false;
        }

        // Check if template is new (not yet saved to database)
        const isNewTemplate = useTemplateStore.getState().isNewTemplate;
        if (isNewTemplate) {
            toast.error('Please save the template first before adding metadata');
            return false;
        }

        set({ isSaving: true, error: null });

        try {
            const success = await updateTemplateMetadata(templateId, {
                categoryId,
                tagIds,
                isFeatured,
                description,
            });

            if (success) {
                // Update original values to reflect saved state
                set({
                    _original: {
                        categoryId,
                        tagIds: [...tagIds],
                        isFeatured,
                        description,
                    },
                    hasUnsavedChanges: false,
                    isSaving: false,
                });
                toast.success('Template metadata saved');
                return true;
            } else {
                set({
                    isSaving: false,
                    error: 'Failed to save metadata',
                });
                toast.error('Failed to save template metadata');
                return false;
            }
        } catch (error) {
            console.error('Error saving template metadata:', error);
            set({
                isSaving: false,
                error: 'Failed to save metadata',
            });
            toast.error('Failed to save template metadata');
            return false;
        }
    },

    // ─────────────────────────────────────────────
    // Discard Changes
    // ─────────────────────────────────────────────

    discardChanges: () => {
        const { _original } = get();

        if (_original) {
            set({
                categoryId: _original.categoryId,
                tagIds: [..._original.tagIds],
                isFeatured: _original.isFeatured,
                description: _original.description,
                hasUnsavedChanges: false,
            });
        }
    },

    // ─────────────────────────────────────────────
    // Utility
    // ─────────────────────────────────────────────

    clear: () => {
        set(initialState);
    },

    clearError: () => {
        set({ error: null });
    },
}));

// ============================================
// Helper Functions
// ============================================

/**
 * Compare two arrays for equality (order-independent)
 */
function arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
}

// ============================================
// Type Exports
// ============================================

export type { TemplateMetadataState, TemplateMetadataActions };
