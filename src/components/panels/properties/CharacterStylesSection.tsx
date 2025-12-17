'use client';

/**
 * CharacterStylesSection Component
 * 
 * Properties panel section showing character-level styles for rich text.
 * Displays style chips with range info and provides rich text mode toggle.
 * 
 * @module components/panels/properties/CharacterStylesSection
 */

import React, { memo, useCallback, useState, useMemo } from 'react';
import {
    Type,
    Trash2,
    ChevronDown,
    ChevronRight,
    ToggleLeft,
    ToggleRight,
    AlertTriangle,
} from 'lucide-react';
import { TextElement, CharacterStyle } from '@/types/editor';
import { useEditorStore } from '@/stores/editorStore';
import { getTextSnippet } from '@/lib/text/characterStyles';
import { cn } from '@/lib/utils';
import { SectionHeader } from './shared';

// ============================================
// Types
// ============================================

interface CharacterStylesSectionProps {
    element: TextElement;
}

// ============================================
// Component
// ============================================

export const CharacterStylesSection = memo(function CharacterStylesSection({
    element,
}: CharacterStylesSectionProps) {
    const updateElement = useEditorStore((s) => s.updateElement);
    const pushHistory = useEditorStore((s) => s.pushHistory);
    
    const [expandedStyleId, setExpandedStyleId] = useState<string | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    
    const isRichTextEnabled = element.richTextEnabled || false;
    const characterStyles = useMemo(() => element.characterStyles || [], [element.characterStyles]);
    
    // Toggle rich text mode
    const handleToggleRichText = useCallback(() => {
        if (isRichTextEnabled && characterStyles.length > 0) {
            // Show confirmation dialog before disabling
            setShowConfirmDialog(true);
        } else {
            updateElement(element.id, {
                richTextEnabled: !isRichTextEnabled,
                characterStyles: !isRichTextEnabled ? [] : characterStyles,
            });
            pushHistory();
        }
    }, [element.id, isRichTextEnabled, characterStyles, updateElement, pushHistory]);
    
    // Confirm disable rich text
    const handleConfirmDisable = useCallback(() => {
        updateElement(element.id, {
            richTextEnabled: false,
            characterStyles: [],
        });
        pushHistory();
        setShowConfirmDialog(false);
    }, [element.id, updateElement, pushHistory]);
    
    // Remove a character style
    const handleRemoveStyle = useCallback((styleId: string) => {
        const newStyles = characterStyles.filter(s => s.id !== styleId);
        updateElement(element.id, { characterStyles: newStyles });
        pushHistory();
    }, [element.id, characterStyles, updateElement, pushHistory]);
    
    // Toggle style expansion
    const handleToggleExpand = useCallback((styleId: string) => {
        setExpandedStyleId(prev => prev === styleId ? null : styleId);
    }, []);
    
    return (
        <div className="space-y-4">
            <SectionHeader title="CHARACTER STYLES" />
            
            {/* Rich Text Mode Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Rich Text Mode</span>
                </div>
                <button
                    onClick={handleToggleRichText}
                    className={cn(
                        'p-1 rounded transition-colors',
                        isRichTextEnabled ? 'text-blue-600' : 'text-gray-400'
                    )}
                    aria-label={isRichTextEnabled ? 'Disable rich text' : 'Enable rich text'}
                    aria-pressed={isRichTextEnabled}
                >
                    {isRichTextEnabled ? (
                        <ToggleRight className="w-6 h-6" />
                    ) : (
                        <ToggleLeft className="w-6 h-6" />
                    )}
                </button>
            </div>
            
            {/* Rich Text Info */}
            {!isRichTextEnabled && (
                <div className="text-xs text-gray-500 p-2 bg-blue-50 rounded-lg">
                    <p>Enable rich text mode to apply different styles to individual characters or words.</p>
                    <p className="mt-1">Double-click the text element on canvas to open the rich text editor.</p>
                </div>
            )}
            
            {/* Character Styles List */}
            {isRichTextEnabled && (
                <div className="space-y-2">
                    {characterStyles.length === 0 ? (
                        <div className="text-center py-4 text-gray-400 text-sm">
                            <p>No character styles applied.</p>
                            <p className="text-xs mt-1">Double-click text to edit with rich formatting.</p>
                        </div>
                    ) : (
                        characterStyles.map((style) => (
                            <StyleChip
                                key={style.id}
                                style={style}
                                text={element.text}
                                isExpanded={expandedStyleId === style.id}
                                onToggleExpand={() => handleToggleExpand(style.id)}
                                onRemove={() => handleRemoveStyle(style.id)}
                            />
                        ))
                    )}
                    
                    {/* Style Count Warning */}
                    {characterStyles.length > 50 && (
                        <div className="flex items-center gap-2 p-2 bg-amber-50 text-amber-700 rounded-lg text-xs">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Many styles may affect performance ({characterStyles.length} styles)</span>
                        </div>
                    )}
                </div>
            )}
            
            {/* Confirmation Dialog */}
            {showConfirmDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Disable Rich Text?</h3>
                                <p className="text-sm text-gray-500">This action cannot be undone.</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            Switching to simple text mode will remove all {characterStyles.length} character styles.
                            The text content will be preserved.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowConfirmDialog(false)}
                                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDisable}
                                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
                            >
                                Disable Rich Text
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

// ============================================
// Sub-Components
// ============================================

interface StyleChipProps {
    style: CharacterStyle;
    text: string;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onRemove: () => void;
}

function StyleChip({ style, text, isExpanded, onToggleExpand, onRemove }: StyleChipProps) {
    const snippet = getTextSnippet(text, style);
    
    // Build style properties list
    const properties: string[] = [];
    if (style.fill) properties.push(`Color: ${style.fill}`);
    if (style.fontWeight) properties.push(`Weight: ${style.fontWeight}`);
    if (style.fontSize) properties.push(`Size: ${style.fontSize}px`);
    if (style.fontStyle) properties.push(`Style: ${style.fontStyle}`);
    if (style.textDecoration) properties.push(`Decoration: ${style.textDecoration}`);
    if (style.backgroundColor) properties.push(`Background: ${style.backgroundColor}`);
    
    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Header */}
            <button
                onClick={onToggleExpand}
                className="w-full flex items-center justify-between p-2 hover:bg-gray-50"
            >
                <div className="flex items-center gap-2">
                    {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm font-medium text-gray-700">&ldquo;{snippet}&rdquo;</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                        chars {style.start}-{style.end}
                    </span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove();
                        }}
                        className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500"
                        aria-label="Remove style"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            </button>
            
            {/* Expanded Details */}
            {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-gray-100">
                    {properties.length > 0 ? (
                        <ul className="space-y-1">
                            {properties.map((prop, i) => (
                                <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                    {prop}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-xs text-gray-400">No properties applied</p>
                    )}
                    
                    {/* Preview */}
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm" style={{
                        color: style.fill,
                        fontWeight: style.fontWeight,
                        fontSize: style.fontSize ? `${style.fontSize}px` : undefined,
                        fontStyle: style.fontStyle,
                        textDecoration: style.textDecoration !== 'none' ? style.textDecoration : undefined,
                        backgroundColor: style.backgroundColor,
                    }}>
                        {snippet}
                    </div>
                </div>
            )}
        </div>
    );
}

export default CharacterStylesSection;
