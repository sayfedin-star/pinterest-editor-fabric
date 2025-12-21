/**
 * Store Exports
 * 
 * Central export point for all stores.
 * 
 * Architecture Decision (2025-12-21):
 * - editorStore is the SINGLE SOURCE OF TRUTH for editor state
 * - Specialized stores (elementsStore, selectionStore, canvasStore, layersStore) REMOVED
 * - editorStore consolidates all element, selection, and canvas state
 * 
 * Remaining Stores:
 * - editorStore: Unified editor state (elements, selection, canvas, history)
 * - templateStore: Template metadata and gallery
 * - alignmentStore: Element alignment and distribution (pure functions)
 * 
 * Categories & Tags System (Phase 3):
 * - categoryStore: Category CRUD for template organization
 * - tagStore: Tag CRUD with autocomplete search
 * - templateMetadataStore: Template's category/tags assignment
 */

// Main consolidated store
export { useEditorStore, useHydrated } from './editorStore';

// Template and metadata stores
export { useTemplateStore } from './templateStore';
export { useAlignmentStore } from './alignmentStore';

// Categories & Tags stores (Phase 3)
export { useCategoryStore } from './categoryStore';
export { useTagStore } from './tagStore';
export { useTemplateMetadataStore } from './templateMetadataStore';

// Other stores
export { useSnappingSettingsStore } from './snappingSettingsStore';
export { useToastStore } from './toastStore';
export { useGenerationStore } from './generationStore';

// Re-export types
export type { TemplateState, TemplateActions, TemplateListItem } from './templateStore';
export type { AlignmentState, AlignmentActions, Alignment, DistributeDirection } from './alignmentStore';
export type { CategoryState, CategoryActions } from './categoryStore';
export type { TagState, TagActions } from './tagStore';
export type { TemplateMetadataState, TemplateMetadataActions } from './templateMetadataStore';
