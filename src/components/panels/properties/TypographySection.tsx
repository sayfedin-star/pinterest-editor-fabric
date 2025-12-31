'use client';

import React, { memo, useCallback, useState } from 'react';
import {
    Type,
    CaseSensitive,
    CaseUpper,
    CaseLower,
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { TextElement } from '@/types/editor';
import { cn } from '@/lib/utils';
import { SectionHeader } from './shared';
import { FontPickerBox } from '@/components/editor/FontPickerModal';
import { loadGoogleFont } from '@/lib/fonts/googleFonts';

interface TypographySectionProps {
    element: TextElement;
}

/**
 * TypographySection - Advanced typography controls
 * 
 * Features:
 * - Font Family Selector (with Google Fonts)
 * - Text Transform Buttons (none, uppercase, lowercase, capitalize)
 */
export const TypographySection = memo(function TypographySection({ element }: TypographySectionProps) {
    const updateElement = useEditorStore((s) => s.updateElement);
    const pushHistory = useEditorStore((s) => s.pushHistory);
    
    // Handle changes with history
    const handleChange = useCallback((updates: Partial<TextElement>) => {
        updateElement(element.id, updates);
        pushHistory();
    }, [element.id, updateElement, pushHistory]);

    // Handle font family change
    const handleFontChange = useCallback(async (fontFamily: string, provider: 'system' | 'google' | 'custom', fontUrl?: string) => {
        // Load font if it's a Google Font
        if (provider === 'google') {
            await loadGoogleFont(fontFamily);
        }
        
        handleChange({
            fontFamily,
            fontProvider: provider,
            // Save fontUrl for custom fonts (needed for server-side rendering)
            fontUrl: provider === 'custom' ? fontUrl : undefined,
        });
    }, [handleChange]);

    return (
        <div className="space-y-4">
            <SectionHeader title="TYPOGRAPHY" />

            {/* Font Family */}
            <div className="space-y-1">
                <label className="text-xs text-gray-600 font-medium">Font Family</label>
                <FontPickerBox
                    value={element.fontFamily}
                    onChange={(font) => handleFontChange(font.family, font.provider, font.url)}
                />
            </div>

            {/* Text Transform */}
            <div className="space-y-2">
                <label className="text-xs text-gray-600 font-medium">Text Transform</label>
                <div className="grid grid-cols-4 gap-2">
                    <TextTransformButton
                        icon={<Type className="w-4 h-4" />}
                        label="None"
                        isActive={!element.textTransform || element.textTransform === 'none'}
                        onClick={() => handleChange({ textTransform: 'none' })}
                    />
                    <TextTransformButton
                        icon={<CaseUpper className="w-4 h-4" />}
                        label="UPPER"
                        isActive={element.textTransform === 'uppercase'}
                        onClick={() => handleChange({ textTransform: 'uppercase' })}
                    />
                    <TextTransformButton
                        icon={<CaseLower className="w-4 h-4" />}
                        label="lower"
                        isActive={element.textTransform === 'lowercase'}
                        onClick={() => handleChange({ textTransform: 'lowercase' })}
                    />
                    <TextTransformButton
                        icon={<CaseSensitive className="w-4 h-4" />}
                        label="Title"
                        isActive={element.textTransform === 'capitalize'}
                        onClick={() => handleChange({ textTransform: 'capitalize' })}
                    />
                </div>
            </div>
        </div>
    );
});

/** Text transform button component */
function TextTransformButton({
    icon,
    label,
    isActive,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            aria-pressed={isActive}
            aria-label={`Text transform: ${label}`}
            className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all duration-150",
                isActive
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600"
            )}
        >
            {icon}
            <span className="text-[10px]">{label}</span>
        </button>
    );
}
