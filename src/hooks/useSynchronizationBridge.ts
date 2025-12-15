import { useEffect, useRef } from 'react';
import { CanvasManager } from '@/lib/canvas/CanvasManager';
import { useEditorStore } from '@/stores/editorStore';
import { Element } from '@/types/editor';

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
        console.log('[SynchronizationBridge] Setting up Canvas  React sync');

        const handleElementsChanged = (updatedElements: Element[]) => {
            if (isUpdatingRef.current.fromCanvas) {
                console.log('[SynchronizationBridge] Loop prevented');
                return;
            }

            console.log('[SynchronizationBridge] Canvas  React: Elements changed', updatedElements.length);
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
                console.log('[SynchronizationBridge] React state updated successfully');
            } catch (error) {
                console.error('[SynchronizationBridge] Error updating React state:', error);
            } finally {
                isUpdatingRef.current.fromCanvas = false;
            }
        };

        canvasManager.onElementsChanged(handleElementsChanged);
        return () => console.log('[SynchronizationBridge] Cleaning up Canvas  React sync');
    }, [canvasManager, updateElement]);

    // Direction 2: Selection Sync
    useEffect(() => {
        if (!canvasManager) return;
        console.log('[SynchronizationBridge] Setting up selection sync');

        const handleSelectionChanged = (selectedIds: string[]) => {
            console.log('[SynchronizationBridge] Selection changed:', selectedIds);
            useEditorStore.setState({ selectedIds });
        };

        canvasManager.onSelectionChanged(handleSelectionChanged);
        return () => console.log('[SynchronizationBridge] Cleaning up selection sync');
    }, [canvasManager]);

    // Direction 3: React  Canvas Sync
    useEffect(() => {
        if (!canvasManager) return;
        console.log('[SynchronizationBridge] Setting up React  Canvas sync');

        const unsubscribe = useEditorStore.subscribe(() => {
            if (isUpdatingRef.current.fromCanvas) return;
            console.log('[SynchronizationBridge] React  Canvas: Store changed');
        });

        return () => {
            unsubscribe();
            console.log('[SynchronizationBridge] Cleaning up React  Canvas sync');
        };
    }, [canvasManager]);

    // Direction 4: Settings  Canvas Sync
    useEffect(() => {
        if (!canvasManager) return;
        console.log('[SynchronizationBridge] Setting up Settings  Canvas sync');

        let previousSnappingEnabled = useEditorStore.getState().snappingEnabled;

        const unsubscribe = useEditorStore.subscribe((state) => {
            if (state.snappingEnabled !== previousSnappingEnabled) {
                console.log('[SynchronizationBridge] Settings  Canvas: Snapping changed:', state.snappingEnabled);
                previousSnappingEnabled = state.snappingEnabled;

                canvasManager.updateSnappingSettings({
                    magneticSnapping: state.snappingEnabled,
                    showGuideLines: state.snappingEnabled,
                    magneticSnapThreshold: 5,
                } as any);
            }
        });

        return () => {
            unsubscribe();
            console.log('[SynchronizationBridge] Cleaning up Settings  Canvas sync');
        };
    }, [canvasManager]);

    console.log('[SynchronizationBridge] Hook initialized (bidirectional sync active)');
}
