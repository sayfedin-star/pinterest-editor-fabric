/**
 * Store Exports
 * 
 * Central export point for all stores.
 * 
 * Architecture Decision (2025-12-15):
 * - editorStore serves as FACADE over specialized stores
 * - Specialized stores are the SOURCE OF TRUTH
 * - editorStore delegates to specialized stores internally
 * - Components can use either interface (legacy support)
 * 
 * Store Architecture (6 specialized stores):
 * - selectionStore: Element selection management
 * - canvasStore: Canvas size, background, zoom
 * - templateStore: Template metadata and gallery
 * - layersStore: Layer ordering operations (pure functions)
 * - elementsStore: Element CRUD operations
 * - alignmentStore: Element alignment and distribution (pure functions)
 * 
 * Note: historyStore was REMOVED (2025-12-15)
 * History management stays in editorStore as it coordinates multiple stores
 */

// Facade store (delegates to specialized stores internally)
export { useEditorStore, useHydrated } from './editorStore';

// Specialized stores (source of truth)
export { useSelectionStore } from './selectionStore';
export { useCanvasStore } from './canvasStore';
export { useTemplateStore } from './templateStore';
export { useLayersStore } from './layersStore';
export { useElementsStore } from './elementsStore';
export { useAlignmentStore } from './alignmentStore';

// Other stores
export { useSnappingSettingsStore } from './snappingSettingsStore';
export { useToastStore } from './toastStore';
export { useGenerationStore } from './generationStore';

// Re-export types
export type { SelectionState, SelectionActions } from './selectionStore';
export type { CanvasState, CanvasActions } from './canvasStore';
export type { TemplateState, TemplateActions, TemplateListItem } from './templateStore';
export type { LayersState, LayersActions } from './layersStore';
export type { ElementsState, ElementsActions } from './elementsStore';
export type { AlignmentState, AlignmentActions, Alignment, DistributeDirection } from './alignmentStore';
