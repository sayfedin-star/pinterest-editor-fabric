import { useEffect, useRef } from 'react';
import { CanvasManager } from '@/lib/canvas/CanvasManager';
import { useEditorStore } from '@/stores/editorStore';
import { Element } from '@/types/editor';

// Set to true for debugging sync issues
const DEBUG_SYNC = false;

/**
 * SynchronizationBridge - Mediator (Layer 2)
 * 
 * Translates between CanvasManager imperative world and React declarative world.
 * 
 * SIMPLIFIED (2025-12-21): Now uses only editorStore as single source of truth.
 * Previous 5 directions → 3 directions (removed duplication)
 * 
 * Key Responsibility: Prevent circular update loops
 */
export function useSynchronizationBridge(canvasManager: CanvasManager | null) {
    const isUpdatingRef = useRef({ fromCanvas: false });
    const prevZIndexesRef = useRef<Map<string, number>>(new Map());

    // Direction 1: Canvas -> React State (position/size changes from dragging)
    useEffect(() => {
        if (!canvasManager) return;
        if (DEBUG_SYNC) console.log('[SynchronizationBridge] Setting up Canvas → React sync');

        const handleElementsChanged = (updatedElements: Element[]) => {
            if (isUpdatingRef.current.fromCanvas) {
                return;
            }

            if (DEBUG_SYNC) console.log('[SynchronizationBridge] Canvas → React:', updatedElements.length, 'elements');
            isUpdatingRef.current.fromCanvas = true;

            try {
                // CONSOLIDATED: Update editorStore directly (single source of truth)
                for (const element of updatedElements) {
                    useEditorStore.getState().updateElement(element.id, {
                        x: element.x,
                        y: element.y,
                        width: element.width,
                        height: element.height,
                        rotation: element.rotation,
                    });
                }
            } catch (error) {
                console.error('[SynchronizationBridge] Error updating React state:', error);
            } finally {
                isUpdatingRef.current.fromCanvas = false;
            }
        };

        canvasManager.onElementsChanged(handleElementsChanged);
        return () => { };
    }, [canvasManager]);

    // Direction 2: Selection Sync (Canvas -> editorStore)
    useEffect(() => {
        if (!canvasManager) return;

        const handleSelectionChanged = (selectedIds: string[]) => {
            if (DEBUG_SYNC) console.log('[SynchronizationBridge] Selection:', selectedIds);
            // CONSOLIDATED: Update editorStore directly (single source of truth)
            useEditorStore.setState({ selectedIds });
        };

        canvasManager.onSelectionChanged(handleSelectionChanged);
        return () => { };
    }, [canvasManager]);

    // Direction 3: Settings -> Canvas Sync (snapping settings)
    useEffect(() => {
        if (!canvasManager) return;

        let previousSnappingEnabled = useEditorStore.getState().snappingEnabled;

        const unsubscribe = useEditorStore.subscribe((state) => {
            if (state.snappingEnabled !== previousSnappingEnabled) {
                if (DEBUG_SYNC) console.log('[SynchronizationBridge] Snapping:', state.snappingEnabled);
                previousSnappingEnabled = state.snappingEnabled;

                canvasManager.updateSnappingSettings({
                    enabled: state.snappingEnabled,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any);
            }
        });

        return () => unsubscribe();
    }, [canvasManager]);

    // Direction 4: zIndex/Layer Order Sync (editorStore -> Canvas)
    useEffect(() => {
        if (!canvasManager) return;

        const unsubscribe = useEditorStore.subscribe((state) => {
            if (isUpdatingRef.current.fromCanvas) return;

            const elements = state.elements;
            let hasZIndexChange = false;

            // Check if any zIndex values changed
            for (const element of elements) {
                const prevZIndex = prevZIndexesRef.current.get(element.id);
                if (prevZIndex !== undefined && prevZIndex !== element.zIndex) {
                    hasZIndexChange = true;
                    break;
                }
            }

            // Also check if element count changed (might affect z-order)
            if (prevZIndexesRef.current.size !== elements.length) {
                hasZIndexChange = true;
            }

            // Update previous zIndex map
            prevZIndexesRef.current = new Map(elements.map(el => [el.id, el.zIndex]));

            // Trigger reorder if zIndex changed
            if (hasZIndexChange) {
                if (DEBUG_SYNC) console.log('[SynchronizationBridge] zIndex changed, reordering');
                canvasManager.reorderElementsByZIndex(elements);
            }
        });

        // Initialize previous zIndex map
        const initialElements = useEditorStore.getState().elements;
        prevZIndexesRef.current = new Map(initialElements.map(el => [el.id, el.zIndex]));

        return () => unsubscribe();
    }, [canvasManager]);

    // Direction 5: Selection Sync (Store → Canvas)
    // FIX: When clicking a layer in the panel, select it on canvas too
    useEffect(() => {
        if (!canvasManager) return;

        // Track previous selection to avoid loops
        let previousSelectedIds: string[] = [];
        let isUpdatingFromCanvas = false;

        // Subscribe to store selection changes
        const unsubscribe = useEditorStore.subscribe((state) => {
            // Skip if this update came from canvas (avoid loop)
            if (isUpdatingFromCanvas) return;

            const currentIds = state.selectedIds;
            
            // Check if selection actually changed
            const changed = 
                currentIds.length !== previousSelectedIds.length ||
                currentIds.some((id, i) => id !== previousSelectedIds[i]);

            if (changed) {
                if (DEBUG_SYNC) console.log('[SynchronizationBridge] Store → Canvas selection:', currentIds);
                
                // Get current canvas selection
                const canvasSelection = canvasManager.getSelection();
                
                // Only update canvas if it doesn't match store
                const canvasMatches = 
                    canvasSelection.length === currentIds.length &&
                    canvasSelection.every((id, i) => id === currentIds[i]);

                if (!canvasMatches) {
                    isUpdatingFromCanvas = true;
                    canvasManager.setSelection(currentIds);
                    isUpdatingFromCanvas = false;
                }
                
                previousSelectedIds = [...currentIds];
            }
        });

        // Initialize with current selection
        previousSelectedIds = [...useEditorStore.getState().selectedIds];

        return () => unsubscribe();
    }, [canvasManager]);
}

