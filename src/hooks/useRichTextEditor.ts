/**
 * useRichTextEditor Hook
 * 
 * Custom hook for managing rich text editor state and operations.
 * Handles text selection tracking, style application, and canvas sync.
 * 
 * @module hooks/useRichTextEditor
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { TextElement, CharacterStyle, TextSelection } from '@/types/editor';
import {
    applyStyleToRange,
    removeStyleFromRange,
    getStylesInRange,
    optimizeStyles,
    adjustStylesAfterTextChange,
    validateCharacterStyles,
    selectionToRange,
} from '@/lib/text/characterStyles';
import { debounce } from 'lodash';

// ============================================
// Types
// ============================================

export interface UseRichTextEditorProps {
    /** The text element being edited */
    element: TextElement;
    /** Callback to update element in store */
    onUpdate: (updates: Partial<TextElement>) => void;
    /** Debounce delay for text changes (ms) */
    debounceMs?: number;
}

export interface UseRichTextEditorReturn {
    // Local state
    localText: string;
    selection: TextSelection;
    characterStyles: CharacterStyle[];
    
    // Text operations
    handleTextChange: (newText: string) => void;
    handleSelectionChange: (start: number, end: number) => void;
    
    // Style operations
    toggleBold: () => void;
    toggleItalic: () => void;
    toggleUnderline: () => void;
    toggleStrikethrough: () => void;
    setTextColor: (color: string) => void;
    setFontSize: (size: number) => void;
    clearFormatting: () => void;
    
    // Style queries (for toolbar button states)
    isBold: boolean;
    isItalic: boolean;
    isUnderlined: boolean;
    isStrikethrough: boolean;
    currentColor: string | undefined;
    currentFontSize: number | undefined;
    
    // Accessibility - screen reader announcements
    announcement: string;
    
    // Commit/cancel
    commit: () => void;
    cancel: () => void;
    hasChanges: boolean;
}

// ============================================
// Hook Implementation
// ============================================

export function useRichTextEditor({
    element,
    onUpdate,
    debounceMs = 300,
}: UseRichTextEditorProps): UseRichTextEditorReturn {
    // Local state - maintains working copy of text and styles
    const [localText, setLocalText] = useState(element.text || '');
    const [characterStyles, setCharacterStyles] = useState<CharacterStyle[]>(
        element.characterStyles || []
    );
    const [selection, setSelection] = useState<TextSelection>({
        start: 0,
        end: 0,
        isCollapsed: true,
    });
    
    // Track if there are uncommitted changes
    const [hasChanges, setHasChanges] = useState(false);
    
    // Bug #8: Screen reader announcements
    const [announcement, setAnnouncement] = useState('');
    
    // Helper to announce for screen readers (auto-clears after delay)
    const announce = useCallback((message: string) => {
        setAnnouncement(message);
        setTimeout(() => setAnnouncement(''), 2000);
    }, []);
    
    // Ref for original state (for cancel operation)
    const originalStateRef = useRef({
        text: element.text || '',
        characterStyles: element.characterStyles || [],
    });
    
    // Sync with element when it changes externally
    useEffect(() => {
        setLocalText(element.text || '');
        setCharacterStyles(element.characterStyles || []);
        originalStateRef.current = {
            text: element.text || '',
            characterStyles: element.characterStyles || [],
        };
        setHasChanges(false);
    }, [element.id]); // Only reset when element ID changes
    
    // Debounced update function
    const debouncedUpdate = useMemo(
        () =>
            debounce((updates: Partial<TextElement>) => {
                onUpdate(updates);
            }, debounceMs),
        [onUpdate, debounceMs]
    );
    
    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            debouncedUpdate.cancel();
        };
    }, [debouncedUpdate]);
    
    // ============================================
    // Text Operations
    // ============================================
    
    const handleTextChange = useCallback((newText: string) => {
        const oldText = localText;
        setLocalText(newText);
        setHasChanges(true);
        
        // Calculate the change delta for proper style adjustment
        const oldLength = oldText.length;
        const newLength = newText.length;
        const delta = newLength - oldLength;
        
        // Use the cursor position (selection.start) as the change point
        // For simple cases where length changed, this gives us the insertion/deletion point
        const changePosition = selection.start;
        
        let adjustedStyles = characterStyles;
        
        if (delta !== 0 && characterStyles.length > 0) {
            // Use proper style adjustment algorithm
            adjustedStyles = adjustStylesAfterTextChange(
                characterStyles,
                changePosition,
                delta
            );
        }
        
        // Validate and sanitize to ensure no out-of-bounds indices
        const { sanitized } = validateCharacterStyles(adjustedStyles, newLength);
        setCharacterStyles(sanitized);
        
        // Debounced update to store
        debouncedUpdate({
            text: newText,
            characterStyles: sanitized,
        });
    }, [localText, selection, characterStyles, debouncedUpdate]);
    
    const handleSelectionChange = useCallback((start: number, end: number) => {
        setSelection({
            start: Math.min(start, end),
            end: Math.max(start, end),
            isCollapsed: start === end,
        });
    }, []);
    
    // ============================================
    // Style Application
    // ============================================
    
    const applyStyle = useCallback((styleProps: Partial<Omit<CharacterStyle, 'id' | 'start' | 'end'>>) => {
        if (selection.isCollapsed) return;
        
        // Use helper for consistent conversion from browser selection to CharacterStyle range
        const range = selectionToRange(selection);
        
        const newStyles = applyStyleToRange(
            characterStyles,
            range,
            styleProps
        );
        
        setCharacterStyles(newStyles);
        setHasChanges(true);
        
        // Immediate update to store for canvas preview
        onUpdate({ characterStyles: newStyles });
    }, [selection, characterStyles, onUpdate]);
    
    const removeStyle = useCallback((propertyNames: Array<keyof Omit<CharacterStyle, 'id' | 'start' | 'end'>>) => {
        if (selection.isCollapsed) return;
        
        const range = selectionToRange(selection);
        
        const newStyles = removeStyleFromRange(
            characterStyles,
            range,
            propertyNames
        );
        
        setCharacterStyles(newStyles);
        setHasChanges(true);
        
        onUpdate({ characterStyles: newStyles });
    }, [selection, characterStyles, onUpdate]);
    
    // ============================================
    // Toggle Functions
    // ============================================
    
    const toggleBold = useCallback(() => {
        if (selection.isCollapsed) return;
        
        const range = selectionToRange(selection);
        const currentStyles = getStylesInRange(characterStyles, range);
        
        if (currentStyles.fontWeight === 700) {
            removeStyle(['fontWeight']);
            announce('Bold removed');
        } else {
            applyStyle({ fontWeight: 700 });
            announce('Bold applied');
        }
    }, [selection, characterStyles, applyStyle, removeStyle, announce]);
    
    const toggleItalic = useCallback(() => {
        if (selection.isCollapsed) return;
        
        const range = selectionToRange(selection);
        const currentStyles = getStylesInRange(characterStyles, range);
        
        if (currentStyles.fontStyle === 'italic') {
            removeStyle(['fontStyle']);
            announce('Italic removed');
        } else {
            applyStyle({ fontStyle: 'italic' });
            announce('Italic applied');
        }
    }, [selection, characterStyles, applyStyle, removeStyle, announce]);
    
    const toggleUnderline = useCallback(() => {
        if (selection.isCollapsed) return;
        
        const currentStyles = getStylesInRange(characterStyles, {
            start: selection.start,
            end: selection.end - 1,
        });
        
        if (currentStyles.textDecoration === 'underline') {
            removeStyle(['textDecoration']);
        } else {
            applyStyle({ textDecoration: 'underline' });
        }
    }, [selection, characterStyles, applyStyle, removeStyle]);
    
    const toggleStrikethrough = useCallback(() => {
        if (selection.isCollapsed) return;
        
        const currentStyles = getStylesInRange(characterStyles, {
            start: selection.start,
            end: selection.end - 1,
        });
        
        if (currentStyles.textDecoration === 'line-through') {
            removeStyle(['textDecoration']);
        } else {
            applyStyle({ textDecoration: 'line-through' });
        }
    }, [selection, characterStyles, applyStyle, removeStyle]);
    
    const setTextColor = useCallback((color: string) => {
        applyStyle({ fill: color });
    }, [applyStyle]);
    
    const setFontSize = useCallback((size: number) => {
        if (size >= 8 && size <= 200) {
            applyStyle({ fontSize: size });
        }
    }, [applyStyle]);
    
    const clearFormatting = useCallback(() => {
        if (selection.isCollapsed) return;
        
        removeStyle(['fill', 'fontWeight', 'fontSize', 'fontStyle', 'textDecoration', 'backgroundColor']);
    }, [selection, removeStyle]);
    
    // ============================================
    // Style Queries (Computed)
    // ============================================
    
    const selectionStyles = useMemo(() => {
        if (selection.isCollapsed) return {};
        return getStylesInRange(characterStyles, {
            start: selection.start,
            end: selection.end - 1,
        });
    }, [selection, characterStyles]);
    
    const isBold = selectionStyles.fontWeight === 700;
    const isItalic = selectionStyles.fontStyle === 'italic';
    const isUnderlined = selectionStyles.textDecoration === 'underline';
    const isStrikethrough = selectionStyles.textDecoration === 'line-through';
    const currentColor = selectionStyles.fill;
    const currentFontSize = selectionStyles.fontSize;
    
    // ============================================
    // Commit / Cancel
    // ============================================
    
    const commit = useCallback(() => {
        // Cancel any pending debounced updates and apply immediately
        debouncedUpdate.cancel();
        
        onUpdate({
            text: localText,
            characterStyles: optimizeStyles(characterStyles),
        });
        
        originalStateRef.current = {
            text: localText,
            characterStyles: [...characterStyles],
        };
        setHasChanges(false);
    }, [localText, characterStyles, onUpdate, debouncedUpdate]);
    
    const cancel = useCallback(() => {
        // Cancel any pending updates
        debouncedUpdate.cancel();
        
        // Restore original state
        setLocalText(originalStateRef.current.text);
        setCharacterStyles(originalStateRef.current.characterStyles);
        
        // Revert element to original
        onUpdate({
            text: originalStateRef.current.text,
            characterStyles: originalStateRef.current.characterStyles,
        });
        
        setHasChanges(false);
    }, [onUpdate, debouncedUpdate]);
    
    // ============================================
    // Return
    // ============================================
    
    return {
        // State
        localText,
        selection,
        characterStyles,
        
        // Text operations
        handleTextChange,
        handleSelectionChange,
        
        // Style operations
        toggleBold,
        toggleItalic,
        toggleUnderline,
        toggleStrikethrough,
        setTextColor,
        setFontSize,
        clearFormatting,
        
        // Style queries
        isBold,
        isItalic,
        isUnderlined,
        isStrikethrough,
        currentColor,
        currentFontSize,
        
        // Accessibility
        announcement,
        
        // Commit/cancel
        commit,
        cancel,
        hasChanges,
    };
}
