// useFabricRef - Shared Fabric Canvas ref between components
// This allows the Header to access the Canvas for thumbnail generation

import { useRef, useCallback, MutableRefObject } from 'react';
import * as fabric from 'fabric';
import { create } from 'zustand';

// Store for the canvas ref - allows sharing between components
interface FabricRefStore {
    fabricRef: MutableRefObject<fabric.Canvas | null> | null;
    setFabricRef: (ref: MutableRefObject<fabric.Canvas | null>) => void;
}

export const useFabricRefStore = create<FabricRefStore>((set) => ({
    fabricRef: null,
    setFabricRef: (ref) => set({ fabricRef: ref }),
}));

// Hook to create and register the fabric ref (used in EditorCanvas)
export function useCreateFabricRef() {
    const fabricRef = useRef<fabric.Canvas | null>(null);
    const setFabricRef = useFabricRefStore((s) => s.setFabricRef);

    // Register the ref on mount
    const registerRef = useCallback(() => {
        setFabricRef(fabricRef);
    }, [setFabricRef]);

    return { fabricRef, registerRef };
}

// Hook to access the fabric ref (used in Header and other components)
export function useFabricRef(): MutableRefObject<fabric.Canvas | null> | null {
    const fabricRef = useFabricRefStore((s) => s.fabricRef);
    return fabricRef;
}

// Legacy aliases for compatibility
export const useStageRefStore = useFabricRefStore;
export const useCreateStageRef = useCreateFabricRef;
export const useStageRef = useFabricRef;
