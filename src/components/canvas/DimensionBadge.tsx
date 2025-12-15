'use client';

import React from 'react';

interface DimensionBadgeProps {
    width: number;
    height: number;
    x: number;
    y: number;
    visible: boolean;
    zoom: number;
}

/**
 * Live dimension display badge shown during element resize
 * Canva-style design with dark background and purple labels
 */
export function DimensionBadge({ width, height, x, y, visible, zoom }: DimensionBadgeProps) {
    if (!visible) return null;

    // Position badge centered above the element
    const style: React.CSSProperties = {
        position: 'absolute',
        left: `${x * zoom}px`,
        top: `${(y - 35) * zoom}px`,
        transform: 'translateX(-50%)',
        zIndex: 1002,
        pointerEvents: 'none',
        animation: 'fadeIn 100ms ease-out',
    };

    return (
        <div style={style}>
            <div className="bg-gray-800/90 backdrop-blur-sm text-white text-[13px] font-mono px-3 py-1.5 rounded-md shadow-[0_2px_8px_rgba(0,0,0,0.2)] flex items-center gap-3">
                <span className="flex items-center gap-1">
                    <span className="text-purple-400 font-semibold">w:</span>
                    <span className="font-medium">{Math.round(width)}</span>
                </span>
                <span className="flex items-center gap-1">
                    <span className="text-purple-400 font-semibold">h:</span>
                    <span className="font-medium">{Math.round(height)}</span>
                </span>
            </div>
        </div>
    );
}
