import { useEffect, useRef } from 'react';
import { CanvasManager } from '@/lib/canvas/CanvasManager';
import { useEditorStore } from '@/stores/editorStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { Element } from '@/types/editor';

// Set to true for debugging sync issues
const DEBUG_SYNC = false;

/**
 * SynchronizationBridge - Mediator (Layer 2)
 * 
 * Translates between CanvasManager imperative world and React declarative world.
 * Week 2: Bidirectional sync - Canvas  React + Settings  Canvas
 * 
 * Key Responsibility: Prevent circular update loops
 */
export function useSynchronizationBridge(canvasManager: CanvasManager | null) {
    const isUpdatingRef = useRef({ fromCanvas: false });
    const updateElement = useEditorStore((state) => state.updateElement);

    // Direction 1: Canvas  React State
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
                for (const element of updatedElements) {
                    updateElement(element.id, {
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
    }, [canvasManager, updateElement]);

    // Direction 2: Selection Sync
    useEffect(() => {
        if (!canvasManager) return;

        const handleSelectionChanged = (selectedIds: string[]) => {
            if (DEBUG_SYNC) console.log('[SynchronizationBridge] Selection:', selectedIds);
            useSelectionStore.getState().setSelectedIds(selectedIds);
            useEditorStore.setState({ selectedIds });
        };

        canvasManager.onSelectionChanged(handleSelectionChanged);
        return () => { };
    }, [canvasManager]);

    // Direction 3: React  Canvas Sync
    useEffect(() => {
        if (!canvasManager) return;

        const unsubscribe = useEditorStore.subscribe(() => {
            if (isUpdatingRef.current.fromCanvas) return;
            if (DEBUG_SYNC) console.log('[SynchronizationBridge] React → Canvas: Store changed');
        });

        return () => unsubscribe();
    }, [canvasManager]);

    // Direction 4: Settings  Canvas Sync
    useEffect(() => {
        if (!canvasManager) return;

        let previousSnappingEnabled = useEditorStore.getState().snappingEnabled;

        const unsubscribe = useEditorStore.subscribe((state) => {
            if (state.snappingEnabled !== previousSnappingEnabled) {
                if (DEBUG_SYNC) console.log('[SynchronizationBridge] Snapping:', state.snappingEnabled);
                previousSnappingEnabled = state.snappingEnabled;

                canvasManager.updateSnappingSettings({
                    magneticSnapping: state.snappingEnabled,
                    showGuideLines: state.snappingEnabled,
                    magneticSnapThreshold: 5,
                } as any);
            }
        });

        return () => unsubscribe();
    }, [canvasManager]);
}

