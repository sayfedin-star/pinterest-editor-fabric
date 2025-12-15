'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Standardized icon size tokens
 */
export const ICON_SIZES = {
    xs: 'w-3 h-3',      // 12px - badges, indicators
    sm: 'w-3.5 h-3.5',  // 14px - small buttons
    md: 'w-4 h-4',      // 16px - toolbar, standard
    lg: 'w-5 h-5',      // 20px - sidebar, prominent
    xl: 'w-6 h-6',      // 24px - headers, large
} as const;

/**
 * Stroke weight variants for visual hierarchy
 */
export const ICON_WEIGHTS = {
    light: 1.5,     // Secondary, subtle
    regular: 2,     // Default
    medium: 2.5,    // Emphasized, active
    bold: 3,        // Primary actions
} as const;

/**
 * Semantic color tokens for icons
 */
export const ICON_COLORS = {
    // Semantic
    primary: 'text-blue-600',
    secondary: 'text-gray-600',
    success: 'text-green-600',
    warning: 'text-amber-600',
    danger: 'text-red-600',
    // States
    active: 'text-blue-600',
    inactive: 'text-gray-500',
    disabled: 'text-gray-300',
    muted: 'text-gray-400',
} as const;

export type IconSize = keyof typeof ICON_SIZES;
export type IconWeight = keyof typeof ICON_WEIGHTS;
export type IconColor = keyof typeof ICON_COLORS;

interface IconProps {
    /** The Lucide icon component */
    icon: LucideIcon;
    /** Size preset */
    size?: IconSize;
    /** Stroke weight for visual emphasis */
    weight?: IconWeight;
    /** Semantic color */
    color?: IconColor;
    /** Additional CSS classes */
    className?: string;
    /** Accessibility label (makes icon visible to screen readers) */
    label?: string;
}

/**
 * Standardized Icon component with consistent sizing, colors, and accessibility.
 * 
 * @example
 * // Basic usage
 * <Icon icon={Type} size="lg" />
 * 
 * // With accessibility label
 * <Icon icon={Trash2} size="md" color="danger" label="Delete item" />
 * 
 * // Custom styling
 * <Icon icon={Check} size="sm" className="text-green-500" />
 */
export function Icon({
    icon: IconComponent,
    size = 'md',
    weight = 'regular',
    color,
    className,
    label,
}: IconProps) {
    return (
        <IconComponent
            className={cn(
                ICON_SIZES[size],
                color && ICON_COLORS[color],
                className
            )}
            strokeWidth={ICON_WEIGHTS[weight]}
            aria-label={label}
            aria-hidden={!label}
        />
    );
}

/**
 * Re-export common icons for convenience
 */
export {
    Type,
    Image,
    Square,
    Circle,
    Trash2,
    Copy,
    Save,
    Upload,
    Download,
    Eye,
    EyeOff,
    Lock,
    Unlock,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    Plus,
    Minus,
    X,
    Check,
    AlertCircle,
    Info,
    Loader2,
    RotateCcw,
    RotateCw,
    Undo2,
    Redo2,
    ZoomIn,
    ZoomOut,
    MousePointer2,
    Move,
    Layers,
    Settings,
    MoreHorizontal,
    MoreVertical,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignHorizontalJustifyStart,
    AlignHorizontalJustifyCenter,
    AlignHorizontalJustifyEnd,
    AlignVerticalJustifyStart,
    AlignVerticalJustifyCenter,
    AlignVerticalJustifyEnd,
} from 'lucide-react';
