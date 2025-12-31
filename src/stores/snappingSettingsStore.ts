import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SnappingSettings {
    // Master toggle
    enabled: boolean;

    // Core snapping features
    snapToObjectCenters: boolean;
    snapToObjectEdges: boolean;
    snapToCanvasCenter: boolean;
    snapToBoundaries: boolean;

    // Single threshold (in pixels)
    snapThreshold: number;

    // Visual
    guideColor: string;
}

interface SnappingSettingsStore extends SnappingSettings {
    // Actions
    setEnabled: (value: boolean) => void;
    setSnapToObjectCenters: (value: boolean) => void;
    setSnapToObjectEdges: (value: boolean) => void;
    setSnapToCanvasCenter: (value: boolean) => void;
    setSnapToBoundaries: (value: boolean) => void;
    setSnapThreshold: (value: number) => void;
    setGuideColor: (value: string) => void;
    resetToDefaults: () => void;
}

const defaultSettings: SnappingSettings = {
    enabled: true,
    snapToObjectCenters: true,
    snapToObjectEdges: true,
    snapToCanvasCenter: true,
    snapToBoundaries: true,
    snapThreshold: 8,
    guideColor: '#F63E97',
};

export const useSnappingSettingsStore = create<SnappingSettingsStore>()(
    persist(
        (set) => ({
            ...defaultSettings,

            setEnabled: (value) => set({ enabled: value }),
            setSnapToObjectCenters: (value) => set({ snapToObjectCenters: value }),
            setSnapToObjectEdges: (value) => set({ snapToObjectEdges: value }),
            setSnapToCanvasCenter: (value) => set({ snapToCanvasCenter: value }),
            setSnapToBoundaries: (value) => set({ snapToBoundaries: value }),
            setSnapThreshold: (value) => set({ snapThreshold: value }),
            setGuideColor: (value) => set({ guideColor: value }),
            resetToDefaults: () => set(defaultSettings),
        }),
        {
            name: 'snapping-settings',
        }
    )
);
