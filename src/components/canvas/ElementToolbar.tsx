'use client';

import React from 'react';
import { RotateCcw, Lock, Copy, Trash2, MoreHorizontal } from 'lucide-react';

interface ElementToolbarProps {
    x: number;
    y: number;
    width: number;
    visible: boolean;
    zoom: number;
    isLocked: boolean;
    onRotate: () => void;
    onToggleLock: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onMore: () => void;
}

/**
 * Floating action toolbar shown above selected element
 * Canva-style design with polished visuals and animations
 */
export function ElementToolbar({
    x,
    y,
    width,
    visible,
    zoom,
    isLocked,
    onRotate,
    onToggleLock,
    onDuplicate,
    onDelete,
    onMore,
}: ElementToolbarProps) {
    if (!visible) return null;

    // Position toolbar centered above element, 16px gap
    const style: React.CSSProperties = {
        position: 'absolute',
        left: `${(x + width / 2) * zoom}px`,
        top: `${(y - 52) * zoom}px`,
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

    const deleteButtonClass = `
        w-8 h-8 rounded-md flex items-center justify-center
        transition-all duration-150 ease-out
        active:scale-95
        text-gray-600 hover:bg-red-50 hover:text-red-600
    `;

    return (
        <div style={style}>
            <div className="bg-white rounded-[10px] shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-gray-200/80 flex items-center gap-1 p-1">
                {/* Rotate */}
                <button
                    onClick={onRotate}
                    className={buttonClass}
                    title="Rotate 45°"
                    aria-label="Rotate element 45 degrees"
                >
                    <RotateCcw size={18} strokeWidth={2} />
                </button>

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
