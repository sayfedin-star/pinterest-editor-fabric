/**
 * Template Store
 * 
 * Manages template metadata and template list for the gallery.
 * Extracted from editorStore for better separation of concerns.
 * 
 * Features:
 * - Template ID and name
 * - Template source (native or canva_import)
 * - New template flag
 * - Saving state
 * - Template gallery list
 * 
 * FIX (2025-12-17): Don't persist template name for new templates
 * to prevent confusion when opening editor fresh.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { generateId } from '@/lib/utils';

interface TemplateListItem {
    id: string;
    name: string;
    thumbnail_url?: string;
}

interface TemplateState {
    templateId: string;
    templateName: string;
    templateSource: 'native' | 'canva_import';
    isNewTemplate: boolean;
    isSaving: boolean;
    templates: TemplateListItem[];
}

interface TemplateActions {
    setTemplateName: (name: string) => void;
    setTemplateSource: (source: 'native' | 'canva_import') => void;
    setIsNewTemplate: (isNew: boolean) => void;
    setIsSaving: (saving: boolean) => void;
    setTemplates: (templates: TemplateListItem[]) => void;
    setTemplateId: (id: string) => void;
    resetTemplate: () => void;
}

const initialState: TemplateState = {
    templateId: generateId(),
    templateName: 'Untitled Template',
    templateSource: 'native',
    isNewTemplate: true,
    isSaving: false,
    templates: [],
};

export const useTemplateStore = create<TemplateState & TemplateActions>()(
    persist(
        (set) => ({
            // Initial state
            ...initialState,

            // Actions
            setTemplateName: (name) => set({ templateName: name }),

            setTemplateSource: (source) => set({ templateSource: source }),

            setIsNewTemplate: (isNew) => set({ isNewTemplate: isNew }),

            setIsSaving: (saving) => set({ isSaving: saving }),

            setTemplates: (templates) => set({ templates }),

            setTemplateId: (id) => set({ templateId: id }),

            resetTemplate: () => set({
                templateId: generateId(),
                templateName: 'Untitled Template',
                templateSource: 'native',
                isNewTemplate: true,
            }),
        }),
        {
            name: 'pinterest-template-storage',
            storage: createJSONStorage(() => localStorage),
            // FIX: Custom partialize to handle new template state correctly
            // Only persist fields when they have valid values
            partialize: (state) => {
                // For new templates, only persist minimal state
                if (state.isNewTemplate) {
                    return {
                        templateSource: state.templateSource,
                        isNewTemplate: true,
                        // Don't persist templateId/templateName for new templates
                        // This ensures fresh editor opens clean
                    };
                }
                // For saved templates, persist everything
                return {
                    templateId: state.templateId,
                    templateName: state.templateName,
                    templateSource: state.templateSource,
                    isNewTemplate: state.isNewTemplate,
                };
            },
            // FIX: Merge function to handle partial persisted state
            merge: (persisted, current) => {
                const p = persisted as Partial<TemplateState> | undefined;
                
                // If no valid saved template in storage, start fresh
                if (!p?.templateId || p?.isNewTemplate !== false) {
                    return {
                        ...current,
                        templateId: generateId(),
                        templateName: 'Untitled Template',
                        templateSource: p?.templateSource || 'native',
                        isNewTemplate: true,
                    };
                }
                
                // Valid saved template - restore it
                return {
                    ...current,
                    templateId: p.templateId,
                    templateName: p.templateName || 'Untitled Template',
                    templateSource: p.templateSource || 'native',
                    isNewTemplate: false,
                };
            },
        }
    )
);

// Type export for consumers
export type { TemplateState, TemplateActions, TemplateListItem };
