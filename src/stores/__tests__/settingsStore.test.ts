/**
 * Settings Store Tests
 * 
 * Tests for user preferences store including auto-save settings.
 */

import { useSettingsStore } from '../settingsStore';

// Helper to reset store before each test
const resetStore = () => {
    useSettingsStore.setState({
        autoSaveEnabled: false,
        autoSaveInterval: 30,
    });
};

describe('settingsStore', () => {
    beforeEach(() => {
        resetStore();
    });

    // ========================================
    // DEFAULT VALUES
    // ========================================
    describe('Default Values', () => {
        it('should have auto-save disabled by default', () => {
            resetStore();
            expect(useSettingsStore.getState().autoSaveEnabled).toBe(false);
        });

        it('should have 30 second interval by default', () => {
            resetStore();
            expect(useSettingsStore.getState().autoSaveInterval).toBe(30);
        });
    });

    // ========================================
    // AUTO-SAVE ENABLED
    // ========================================
    describe('setAutoSaveEnabled', () => {
        it('should enable auto-save', () => {
            useSettingsStore.getState().setAutoSaveEnabled(true);
            expect(useSettingsStore.getState().autoSaveEnabled).toBe(true);
        });

        it('should disable auto-save', () => {
            useSettingsStore.getState().setAutoSaveEnabled(true);
            useSettingsStore.getState().setAutoSaveEnabled(false);
            expect(useSettingsStore.getState().autoSaveEnabled).toBe(false);
        });

        it('should toggle auto-save', () => {
            const initial = useSettingsStore.getState().autoSaveEnabled;
            useSettingsStore.getState().setAutoSaveEnabled(!initial);
            expect(useSettingsStore.getState().autoSaveEnabled).toBe(!initial);
        });
    });

    // ========================================
    // AUTO-SAVE INTERVAL
    // ========================================
    describe('setAutoSaveInterval', () => {
        it('should set interval to 10 seconds', () => {
            useSettingsStore.getState().setAutoSaveInterval(10);
            expect(useSettingsStore.getState().autoSaveInterval).toBe(10);
        });

        it('should set interval to 60 seconds', () => {
            useSettingsStore.getState().setAutoSaveInterval(60);
            expect(useSettingsStore.getState().autoSaveInterval).toBe(60);
        });

        it('should set interval to 300 seconds', () => {
            useSettingsStore.getState().setAutoSaveInterval(300);
            expect(useSettingsStore.getState().autoSaveInterval).toBe(300);
        });

        it('should allow any numeric interval', () => {
            useSettingsStore.getState().setAutoSaveInterval(45);
            expect(useSettingsStore.getState().autoSaveInterval).toBe(45);
        });
    });

    // ========================================
    // RESET SETTINGS
    // ========================================
    describe('resetSettings', () => {
        it('should reset all settings to defaults', () => {
            // Change values
            useSettingsStore.getState().setAutoSaveEnabled(true);
            useSettingsStore.getState().setAutoSaveInterval(120);

            // Verify changes
            expect(useSettingsStore.getState().autoSaveEnabled).toBe(true);
            expect(useSettingsStore.getState().autoSaveInterval).toBe(120);

            // Reset
            useSettingsStore.getState().resetSettings();

            // Verify defaults restored
            expect(useSettingsStore.getState().autoSaveEnabled).toBe(false);
            expect(useSettingsStore.getState().autoSaveInterval).toBe(30);
        });
    });

    // ========================================
    // MULTIPLE SETTINGS CHANGES
    // ========================================
    describe('Combined Operations', () => {
        it('should handle multiple setting changes', () => {
            useSettingsStore.getState().setAutoSaveEnabled(true);
            useSettingsStore.getState().setAutoSaveInterval(60);

            const state = useSettingsStore.getState();
            expect(state.autoSaveEnabled).toBe(true);
            expect(state.autoSaveInterval).toBe(60);
        });

        it('should maintain interval when toggling enabled', () => {
            useSettingsStore.getState().setAutoSaveInterval(120);
            useSettingsStore.getState().setAutoSaveEnabled(true);
            useSettingsStore.getState().setAutoSaveEnabled(false);

            expect(useSettingsStore.getState().autoSaveInterval).toBe(120);
        });
    });
});
