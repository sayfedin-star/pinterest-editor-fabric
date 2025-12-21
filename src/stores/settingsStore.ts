/**
 * Settings Store
 * 
 * User preferences for the editor application.
 * Persisted to localStorage for cross-session persistence.
 * 
 * Current settings:
 * - Auto-save: Enable/disable and interval configuration
 * 
 * Future settings can be added here (theme, grid preferences, etc.)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================
// Types
// ============================================

export interface SettingsState {
    /** Whether auto-save is enabled */
    autoSaveEnabled: boolean;
    /** Auto-save interval in seconds (10, 30, 60, 120, 300) */
    autoSaveInterval: number;
}

export interface SettingsActions {
    /** Toggle auto-save on/off */
    setAutoSaveEnabled: (enabled: boolean) => void;
    /** Set auto-save interval in seconds */
    setAutoSaveInterval: (intervalSeconds: number) => void;
    /** Reset all settings to defaults */
    resetSettings: () => void;
}

export type SettingsStore = SettingsState & SettingsActions;

// ============================================
// Defaults
// ============================================

const defaultSettings: SettingsState = {
    autoSaveEnabled: false, // OFF by default (user opt-in)
    autoSaveInterval: 30,   // 30 seconds when enabled
};

// ============================================
// Store
// ============================================

export const useSettingsStore = create<SettingsStore>()(
    persist(
        (set) => ({
            ...defaultSettings,

            setAutoSaveEnabled: (enabled) => set({ autoSaveEnabled: enabled }),
            
            setAutoSaveInterval: (intervalSeconds) => set({ autoSaveInterval: intervalSeconds }),
            
            resetSettings: () => set(defaultSettings),
        }),
        {
            name: 'pinterest-editor-settings',
        }
    )
);
