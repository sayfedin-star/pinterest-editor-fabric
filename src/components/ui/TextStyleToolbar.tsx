'use client';

/**
 * TextStyleToolbar Component
 * 
 * Formatting toolbar for rich text editing with bold, italic, underline,
 * strikethrough, color picker, and font size controls.
 * 
 * @module components/ui/TextStyleToolbar
 */

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Palette,
    Type,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface TextStyleToolbarProps {
    // Style toggle states
    isBold: boolean;
    isItalic: boolean;
    isUnderlined: boolean;
    isStrikethrough: boolean;
    
    // Current values
    currentColor?: string;
    currentFontSize?: number;
    
    // Selection state
    hasSelection: boolean;
    
    // Callbacks
    onBoldClick: () => void;
    onItalicClick: () => void;
    onUnderlineClick: () => void;
    onStrikethroughClick: () => void;
    onColorChange: (color: string) => void;
    onFontSizeChange: (size: number) => void;
    onClearFormatting?: () => void;
    
    // Optional styling
    className?: string;
}

// ============================================
// Constants
// ============================================

const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72, 96];

const COLOR_PRESETS = [
    '#000000', // Black
    '#FFFFFF', // White
    '#FF0000', // Red
    '#FF6B00', // Orange
    '#FFEB3B', // Yellow
    '#4CAF50', // Green
    '#2196F3', // Blue
    '#9C27B0', // Purple
    '#E91E63', // Pink
    '#795548', // Brown
    '#607D8B', // Blue Grey
    '#9E9E9E', // Grey
];

// ============================================
// Component
// ============================================

export const TextStyleToolbar = memo(function TextStyleToolbar({
    isBold,
    isItalic,
    isUnderlined,
    isStrikethrough,
    currentColor,
    currentFontSize,
    hasSelection,
    onBoldClick,
    onItalicClick,
    onUnderlineClick,
    onStrikethroughClick,
    onColorChange,
    onFontSizeChange,
    onClearFormatting,
    className,
}: TextStyleToolbarProps) {
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [customColor, setCustomColor] = useState(currentColor || '#000000');
    const colorPickerRef = useRef<HTMLDivElement>(null);
    
    // Bug #11 Fix: Close color picker on outside click
    useEffect(() => {
        if (!showColorPicker) return;
        
        const handleClickOutside = (e: MouseEvent) => {
            if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
                setShowColorPicker(false);
            }
        };
        
        // Small delay to prevent immediate close on same click that opened
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 50);
        
        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showColorPicker]);
    
    // Handle color selection
    const handleColorSelect = useCallback((color: string) => {
        onColorChange(color);
        setShowColorPicker(false);
    }, [onColorChange]);
    
    // Handle custom color input
    const handleCustomColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const color = e.target.value;
        setCustomColor(color);
    }, []);
    
    const handleCustomColorApply = useCallback(() => {
        if (/^#[0-9A-Fa-f]{6}$/.test(customColor)) {
            onColorChange(customColor);
            setShowColorPicker(false);
        }
    }, [customColor, onColorChange]);
    
    return (
        <div className={cn(
            'flex items-center gap-1 p-2 bg-white rounded-lg shadow-lg border border-gray-200',
            className
        )}>
            {/* Format Buttons Group */}
            <div className="flex items-center gap-0.5">
                <ToolbarButton
                    icon={<Bold className="w-4 h-4" />}
                    label="Bold (Ctrl+B)"
                    isActive={isBold}
                    disabled={!hasSelection}
                    onClick={onBoldClick}
                />
                <ToolbarButton
                    icon={<Italic className="w-4 h-4" />}
                    label="Italic (Ctrl+I)"
                    isActive={isItalic}
                    disabled={!hasSelection}
                    onClick={onItalicClick}
                />
                <ToolbarButton
                    icon={<Underline className="w-4 h-4" />}
                    label="Underline (Ctrl+U)"
                    isActive={isUnderlined}
                    disabled={!hasSelection}
                    onClick={onUnderlineClick}
                />
                <ToolbarButton
                    icon={<Strikethrough className="w-4 h-4" />}
                    label="Strikethrough"
                    isActive={isStrikethrough}
                    disabled={!hasSelection}
                    onClick={onStrikethroughClick}
                />
            </div>
            
            {/* Divider */}
            <div className="w-px h-6 bg-gray-200 mx-1" />
            
            {/* Color Picker */}
            <div className="relative">
                <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    disabled={!hasSelection}
                    className={cn(
                        'flex items-center gap-1 px-2 py-1.5 rounded transition-colors',
                        hasSelection 
                            ? 'hover:bg-gray-100 cursor-pointer' 
                            : 'opacity-50 cursor-not-allowed'
                    )}
                    aria-label="Text color"
                    title="Text color"
                >
                    <Palette className="w-4 h-4" />
                    <div
                        className="w-4 h-4 rounded border border-gray-300"
                        style={{ backgroundColor: currentColor || '#000000' }}
                    />
                </button>
                
                {/* Color Picker Dropdown */}
                {showColorPicker && (
                    <div 
                        ref={colorPickerRef}
                        className="absolute top-full left-0 mt-1 p-3 bg-white rounded-lg shadow-xl border border-gray-200 z-50 w-48"
                    >
                        {/* Preset Colors */}
                        <div className="grid grid-cols-6 gap-1.5 mb-3">
                            {COLOR_PRESETS.map((color) => (
                                <button
                                    key={color}
                                    onClick={() => handleColorSelect(color)}
                                    className={cn(
                                        'w-6 h-6 rounded border-2 transition-transform hover:scale-110',
                                        currentColor === color ? 'border-blue-500' : 'border-gray-200'
                                    )}
                                    style={{ backgroundColor: color }}
                                    aria-label={`Color ${color}`}
                                />
                            ))}
                        </div>
                        
                        {/* Custom Color Input */}
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={customColor}
                                onChange={handleCustomColorChange}
                                className="w-8 h-8 rounded cursor-pointer"
                                aria-label="Custom color picker"
                            />
                            <input
                                type="text"
                                value={customColor}
                                onChange={handleCustomColorChange}
                                placeholder="#000000"
                                className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded"
                                pattern="^#[0-9A-Fa-f]{6}$"
                            />
                            <button
                                onClick={handleCustomColorApply}
                                className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Divider */}
            <div className="w-px h-6 bg-gray-200 mx-1" />
            
            {/* Font Size Dropdown */}
            <div className="flex items-center gap-1">
                <Type className="w-4 h-4 text-gray-500" />
                <select
                    value={currentFontSize || ''}
                    onChange={(e) => onFontSizeChange(parseInt(e.target.value, 10))}
                    disabled={!hasSelection}
                    className={cn(
                        'px-2 py-1 text-sm border border-gray-200 rounded bg-white',
                        hasSelection ? '' : 'opacity-50 cursor-not-allowed'
                    )}
                    aria-label="Font size"
                >
                    <option value="">Size</option>
                    {FONT_SIZES.map((size) => (
                        <option key={size} value={size}>
                            {size}px
                        </option>
                    ))}
                </select>
            </div>
            
            {/* Clear Formatting */}
            {onClearFormatting && (
                <>
                    <div className="w-px h-6 bg-gray-200 mx-1" />
                    <ToolbarButton
                        icon={<X className="w-4 h-4" />}
                        label="Clear formatting"
                        isActive={false}
                        disabled={!hasSelection}
                        onClick={onClearFormatting}
                    />
                </>
            )}
        </div>
    );
});

// ============================================
// Sub-Components
// ============================================

interface ToolbarButtonProps {
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    disabled: boolean;
    onClick: () => void;
}

function ToolbarButton({ icon, label, isActive, disabled, onClick }: ToolbarButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            aria-pressed={isActive}
            title={label}
            className={cn(
                'p-1.5 rounded transition-colors',
                disabled && 'opacity-50 cursor-not-allowed',
                !disabled && isActive && 'bg-blue-100 text-blue-700',
                !disabled && !isActive && 'hover:bg-gray-100 text-gray-700'
            )}
        >
            {icon}
        </button>
    );
}

// Export default for convenience
export default TextStyleToolbar;
