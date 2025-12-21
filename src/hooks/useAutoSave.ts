'use client';

/**
 * Auto-Save Hook
 * 
 * Provides automatic saving functionality for templates.
 * 
 * Features:
 * - Debounced auto-save (every 30 seconds after last change)
 * - Dirty state tracking
 * - Save failure retry with exponential backoff
 * - Browser unload warning when unsaved
 * - Auto-save status indicator
 * 
 * Finding #4 Resolution: Prevents data loss for users
 * 
 * FIX (2025-12-17): Uses templateStore instead of editorStore for
 * template metadata to prevent duplicate template creation.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useTemplateStore } from '@/stores/templateStore';
import { useEditorStore } from '@/stores/editorStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { saveTemplate as saveTemplateToDb } from '@/lib/db/templates';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error' | 'conflict';

interface AutoSaveOptions {
    /** Delay in ms before auto-save triggers after last change */
    debounceMs?: number;
    /** Enable/disable auto-save */
    enabled?: boolean;
    /** Callback when auto-save status changes */
    onStatusChange?: (status: AutoSaveStatus) => void;
}

interface AutoSaveState {
    status: AutoSaveStatus;
    lastSavedAt: Date | null;
    isDirty: boolean;
    errorMessage: string | null;
    /** Whether auto-save is enabled in settings */
    autoSaveEnabled: boolean;
}

export function useAutoSave(options: AutoSaveOptions = {}): AutoSaveState & {
    forceSave: () => Promise<void>;
} {
    // Read user settings (these take precedence over options)
    const settingsEnabled = useSettingsStore((s) => s.autoSaveEnabled);
    const settingsIntervalSec = useSettingsStore((s) => s.autoSaveInterval);

    const {
        // Settings store values override defaults, but options can still override
        debounceMs = settingsIntervalSec * 1000,
        enabled = settingsEnabled,
        onStatusChange,
    } = options;

    // State
    const [status, setStatus] = useState<AutoSaveStatus>('idle');
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastStateRef = useRef<string>('');
    const retryCountRef = useRef(0);
    const isSavingRef = useRef(false); // Prevent concurrent saves
    const saveCompletionTimeRef = useRef(0); // Timestamp of last successful save
    const maxRetries = 3;

    // Get state from templateStore (FIX: use templateStore, not editorStore)
    const templateId = useTemplateStore((s) => s.templateId);
    const templateName = useTemplateStore((s) => s.templateName);
    const isNewTemplate = useTemplateStore((s) => s.isNewTemplate);
    const setTemplateId = useTemplateStore((s) => s.setTemplateId);
    const setIsNewTemplate = useTemplateStore((s) => s.setIsNewTemplate);

    // Get state from consolidated editorStore (instead of specialized stores)
    const elements = useEditorStore((s) => s.elements);
    const canvasSize = useEditorStore((s) => s.canvasSize);
    const backgroundColor = useEditorStore((s) => s.backgroundColor);

    // Update status and notify
    const updateStatus = useCallback((newStatus: AutoSaveStatus) => {
        setStatus(newStatus);
        onStatusChange?.(newStatus);
    }, [onStatusChange]);

    // Compute content-only hash for change detection and race condition fix
    // Excludes templateId which legitimately changes during save (undefined → savedId)
    // Uses JSON.stringify directly to ensure consistent serialization matching what goes to DB
    const computeContentHash = useCallback(() => {
        return JSON.stringify({
            templateName,
            elements, // Direct serialization ensures we catch exactly what changes (excluding undefined/funcs)
            canvasSize,
            backgroundColor,
        });
    }, [templateName, elements, canvasSize, backgroundColor]);

    // Perform the actual save
    const performSave = useCallback(async (): Promise<boolean> => {
        // Prevent concurrent saves
        if (isSavingRef.current) {
            return false;
        }

        // Don't save if:
        // - Template is new and unnamed
        // - No elements
        // - Not configured
        if (templateName === 'Untitled Template' || templateName.trim() === '') {
            return false;
        }

        if (elements.length === 0) {
            return false;
        }

        if (!isSupabaseConfigured()) {
            // localStorage persistence is handled by Zustand's persist
            setLastSavedAt(new Date());
            setIsDirty(false);
            updateStatus('saved');
            return true;
        }

        // Get user
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return false;
        }

        isSavingRef.current = true;
        updateStatus('saving');

        // FIX: Capture CONTENT hash BEFORE save (excludes templateId which changes during save)
        const preSaveContentHash = computeContentHash();

        try {
            // FIX: If new template has same name as existing, SKIP auto-save
            // User must rename or manually save to update existing
            const effectiveTemplateId = isNewTemplate ? undefined : templateId;
            
            if (isNewTemplate) {
                const { checkTemplateNameExists } = await import('@/lib/db/templates');
                const { exists } = await checkTemplateNameExists(templateName);
                if (exists) {
                    // Don't auto-save if name conflicts - user must choose
                    // Set status to 'conflict' so UI can show helpful message
                    isSavingRef.current = false;
                    updateStatus('conflict');
                    return false;
                }
            }

            const savedTemplate = await saveTemplateToDb({
                id: effectiveTemplateId,
                name: templateName,
                canvas_size: canvasSize,
                background_color: backgroundColor,
                elements: elements,
            });

            if (savedTemplate) {
                // FIX: Don't call loadTemplate - elements are already in stores
                // Just sync the template IDs across stores
                
                if (isNewTemplate || savedTemplate.id !== templateId) {
                    // Update templateStore with new/correct ID
                    setTemplateId(savedTemplate.id);
                    setIsNewTemplate(false);
                    
                    // Also update editorStore's ID (without resetting elements)
                    useEditorStore.setState({
                        templateId: savedTemplate.id,
                        isNewTemplate: false
                    });
                }

                setLastSavedAt(new Date());
                setErrorMessage(null);
                retryCountRef.current = 0;
                
                // FIX: Check if CONTENT changed DURING save (race condition fix)
                // Use content hash (not state hash) because templateId legitimately changes during save
                const postSaveContentHash = computeContentHash();
                if (postSaveContentHash !== preSaveContentHash) {
                    // Content changed during save - still dirty, need another save
                    setIsDirty(true);
                    lastStateRef.current = postSaveContentHash; // Mark what we just processed
                    updateStatus('pending');
                    // Schedule another save for the changes made during this save
                    if (saveTimeoutRef.current) {
                        clearTimeout(saveTimeoutRef.current);
                    }
                    saveTimeoutRef.current = setTimeout(() => performSave(), debounceMs);
                    return true; // This save succeeded, but more work to do
                }
                
                // No concurrent changes - we're clean
                lastStateRef.current = postSaveContentHash;
                setIsDirty(false);
                saveCompletionTimeRef.current = Date.now(); // Start grace period
                updateStatus('saved');
                return true;
            } else {
                throw new Error('Save returned null');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            setErrorMessage(message);
            updateStatus('error');
            return false;
        } finally {
            isSavingRef.current = false;
        }
    }, [
        templateId,
        templateName,
        isNewTemplate,
        elements,
        canvasSize,
        backgroundColor,
        setTemplateId,
        setIsNewTemplate,
        computeContentHash,
        updateStatus,
        debounceMs,
    ]);

    // Force save (public API)
    const forceSave = useCallback(async () => {
        // Clear any pending auto-save
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }
        await performSave();
    }, [performSave]);

    // Schedule auto-save
    const scheduleAutoSave = useCallback(() => {
        if (!enabled) return;

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        updateStatus('pending');

        // Schedule new save
        saveTimeoutRef.current = setTimeout(async () => {
            const success = await performSave();

            // Retry on failure with exponential backoff
            if (!success && retryCountRef.current < maxRetries) {
                retryCountRef.current++;
                const retryDelay = Math.min(debounceMs * Math.pow(2, retryCountRef.current), 60000);
                saveTimeoutRef.current = setTimeout(() => performSave(), retryDelay);
            }
        }, debounceMs);
    }, [enabled, performSave, debounceMs, updateStatus]);

    // Detect changes and trigger auto-save
    // FIX: Use content hash (excludes templateId) to avoid false positives when templateId changes after save
    useEffect(() => {
        // Skip detection for a grace period (1s) after save to prevent false positives
        // from the cascade of re-renders that happen when store IDs update
        if (Date.now() - saveCompletionTimeRef.current < 1000) {
            return;
        }

        const currentHash = computeContentHash();

        // Skip if no change
        if (currentHash === lastStateRef.current) {
            return;
        }

        // Skip on initial render
        if (lastStateRef.current === '') {
            lastStateRef.current = currentHash;
            return;
        }

        // Mark as dirty and schedule save
        setIsDirty(true);
        scheduleAutoSave();
    }, [computeContentHash, scheduleAutoSave]);

    // Warn on unload when there are actual unsaved changes
    // FIX: Check actual hash difference instead of trusting isDirty flag
    // This is more reliable because it checks content at the moment of navigation
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            // Only warn if content has actually changed from last saved state
            const currentHash = computeContentHash();
            const hasRealChanges = lastStateRef.current !== '' && currentHash !== lastStateRef.current;
            
            if (hasRealChanges) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [computeContentHash]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    return {
        status,
        lastSavedAt,
        isDirty,
        errorMessage,
        forceSave,
        autoSaveEnabled: enabled,
    };
}

/**
 * Format relative time for "Last saved X minutes ago"
 */
export function formatRelativeTime(date: Date | null): string {
    if (!date) return 'Never saved';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffSec < 10) return 'Just saved';
    if (diffSec < 60) return `Saved ${diffSec}s ago`;
    if (diffMin < 60) return `Saved ${diffMin}m ago`;
    if (diffHour < 24) return `Saved ${diffHour}h ago`;

    return `Saved on ${date.toLocaleDateString()}`;
}
