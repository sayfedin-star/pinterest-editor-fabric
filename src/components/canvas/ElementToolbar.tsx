'use client';

import React, { useState, useMemo } from 'react';
import { Lock, Copy, Trash2, MoreHorizontal, AlertTriangle, Zap } from 'lucide-react';
import { Element } from '@/types/editor';
import { isNameDuplicate } from '@/lib/utils/nameValidation';
import { DynamicFieldPopup } from './DynamicFieldPopup';

interface ElementToolbarProps {
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
    zoom: number;
    isLocked: boolean;
    elementName: string;
    elementId: string;
    elementType: 'image' | 'text' | 'shape';
    isDynamic: boolean;
    dynamicFieldName?: string;
    elements: Element[];
    onToggleLock: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onMore: () => void;
    onRename: (newName: string) => void;
    onDynamicChange: (fieldName: string, isDynamic: boolean) => void;
}

/**
 * Floating action toolbar shown above selected element
 * Canva-style design with polished visuals and animations
 * Positioned 100px from top of viewport
 */
export function ElementToolbar({
    x,
    y,
    width,
    height,
    visible,
    zoom,
    isLocked,
    elementName,
    elementId,
    elementType,
    isDynamic,
    dynamicFieldName,
    elements,
    onToggleLock,
    onDuplicate,
    onDelete,
    onMore,
    onRename,
    onDynamicChange,
}: ElementToolbarProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(elementName);
    const [showDynamicPopup, setShowDynamicPopup] = useState(false);
    const [lastElementId, setLastElementId] = useState(elementId);

    // Sync editValue when a different element is selected
    // This prevents stale name from showing when switching elements
    if (lastElementId !== elementId) {
        setLastElementId(elementId);
        setEditValue(elementName);
        setIsEditing(false);
        setShowDynamicPopup(false);
    }

    // Check for duplicate using useMemo (inline calculation, no useEffect)
    const isDuplicateName = useMemo(() => {
        if (!isEditing || editValue.trim() === elementName) return false;
        return isNameDuplicate(editValue.trim(), elements, elementId);
    }, [isEditing, editValue, elementName, elements, elementId]);

    if (!visible) return null;

    // Position toolbar BELOW element for better UX (doesn't obscure element)
    const toolbarHeight = 44; // Approximate toolbar height
    const gap = 24; // Gap between toolbar and element (doubled from 12)
    
    // Use actual element height (passed from EditorCanvas)
    const elementHeight = height || 100; // Fallback if height not provided
    
    // Position BELOW the element
    const calculatedTop = (y + elementHeight) * zoom + gap;
    
    // If toolbar would go off the bottom (past 85% of viewport), position above instead
    const shouldPositionAbove = calculatedTop > window.innerHeight * 0.85;
    const yPos = shouldPositionAbove 
        ? Math.max(10, (y * zoom) - toolbarHeight - gap)
        : calculatedTop;
    
    const style: React.CSSProperties = {
        position: 'absolute',
        left: `${(x + width / 2) * zoom}px`,
        top: `${yPos}px`,
        transform: 'translateX(-50%)',
        zIndex: 1001,
        animation: 'fadeIn 150ms ease-out',
    };


    const buttonClass = `
        w-8 h-8 rounded-md flex items-center justify-center
        transition-all duration-150 ease-out
        hover:bg-gray-100 active:scale-95
        text-gray-600 hover:text-gray-900
    `;

    const lockedButtonClass = `
        w-8 h-8 rounded-md flex items-center justify-center
        transition-all duration-150 ease-out
        active:scale-95
        ${isLocked
            ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
        }
    `;

    const dynamicButtonClass = `
        w-8 h-8 rounded-md flex items-center justify-center
        transition-all duration-150 ease-out
        active:scale-95
        ${isDynamic
            ? 'bg-purple-50 text-purple-600 hover:bg-purple-100'
            : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
        }
    `;

    const deleteButtonClass = `
        w-8 h-8 rounded-md flex items-center justify-center
        transition-all duration-150 ease-out
        active:scale-95
        text-gray-600 hover:bg-red-50 hover:text-red-600
    `;

    const handleStartEdit = () => {
        setEditValue(elementName);
        setIsEditing(true);
    };

    const handleFinishEdit = () => {
        // Block save if name is duplicate - revert to original
        if (isDuplicateName) {
            setEditValue(elementName);
            setIsEditing(false);
            return;
        }
        
        if (editValue.trim() && editValue !== elementName) {
            onRename(editValue.trim());
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleFinishEdit();
        } else if (e.key === 'Escape') {
            setEditValue(elementName);
            setIsEditing(false);
        }
    };

    // Only show dynamic button for image and text elements
    const showDynamicButton = elementType === 'image' || elementType === 'text';

    return (
        <div style={style}>
            <div className="bg-white rounded-[10px] shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-gray-200/80 flex items-center gap-1 p-1 relative">
                {/* Rename Input */}
                {isEditing ? (
                    <div className="relative">
                        <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleFinishEdit}
                            onKeyDown={handleKeyDown}
                            className={`h-7 px-2 text-sm rounded-md focus:outline-none focus:ring-2 min-w-[80px] ${
                                isDuplicateName 
                                    ? 'border-2 border-amber-400 focus:ring-amber-400' 
                                    : 'border border-blue-400 focus:ring-blue-500'
                            }`}
                            autoFocus
                        />
                        {isDuplicateName && (
                            <div className="absolute -top-8 left-0 right-0 flex items-center gap-1 bg-amber-50 text-amber-700 text-xs px-2 py-1 rounded border border-amber-200 whitespace-nowrap">
                                <AlertTriangle size={12} />
                                Name already exists
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={handleStartEdit}
                        className="h-7 px-3 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors border border-gray-200"
                        title="Click to rename"
                    >
                        {elementName}
                    </button>
                )}

                {/* Dynamic Data Button - Only for image/text */}
                {showDynamicButton && (
                    <div className="relative">
                        <button
                            onClick={() => setShowDynamicPopup(!showDynamicPopup)}
                            className={dynamicButtonClass}
                            title={isDynamic ? `Dynamic: ${dynamicFieldName}` : "Make dynamic"}
                            aria-label="Configure dynamic field"
                            aria-pressed={isDynamic}
                        >
                            <Zap size={18} strokeWidth={2} />
                        </button>
                        
                        <DynamicFieldPopup
                            isOpen={showDynamicPopup}
                            onClose={() => setShowDynamicPopup(false)}
                            currentFieldName={dynamicFieldName}
                            isDynamic={isDynamic}
                            elementType={elementType as 'image' | 'text'}
                            elements={elements}
                            onSave={onDynamicChange}
                        />
                    </div>
                )}

                {/* Lock/Unlock */}
                <button
                    onClick={onToggleLock}
                    className={lockedButtonClass}
                    title={isLocked ? "Unlock" : "Lock"}
                    aria-label={isLocked ? "Unlock element" : "Lock element"}
                    aria-pressed={isLocked}
                >
                    <Lock size={18} strokeWidth={2} />
                </button>

                {/* Duplicate */}
                <button
                    onClick={onDuplicate}
                    className={buttonClass}
                    title="Duplicate"
                    aria-label="Duplicate element"
                >
                    <Copy size={18} strokeWidth={2} />
                </button>

                {/* Delete */}
                <button
                    onClick={onDelete}
                    className={deleteButtonClass}
                    title="Delete"
                    aria-label="Delete element"
                >
                    <Trash2 size={18} strokeWidth={2} />
                </button>

                {/* More Options */}
                <button
                    onClick={onMore}
                    className={buttonClass}
                    title="More options"
                    aria-label="Show more options"
                    aria-haspopup="menu"
                >
                    <MoreHorizontal size={18} strokeWidth={2} />
                </button>
            </div>
        </div>
    );
}
