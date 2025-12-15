'use client';

import React from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ICON_SIZES, ICON_WEIGHTS, IconSize, IconWeight } from './Icon';

/**
 * Button variant styles
 */
const BUTTON_VARIANTS = {
    default: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
    ghost: 'hover:bg-gray-100 text-gray-600 hover:text-gray-900',
    outline: 'border border-gray-300 hover:bg-gray-50 hover:border-gray-400',
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    danger: 'hover:bg-red-50 text-red-600 hover:text-red-700',
    success: 'hover:bg-green-50 text-green-600 hover:text-green-700',
} as const;

type ButtonVariant = keyof typeof BUTTON_VARIANTS;

interface IconButtonProps {
    /** The Lucide icon component */
    icon: LucideIcon;
    /** Accessible label (required for screen readers) */
    label: string;
    /** Click handler */
    onClick: () => void;
    /** Size of the icon */
    size?: IconSize;
    /** Stroke weight */
    weight?: IconWeight;
    /** Button style variant */
    variant?: ButtonVariant;
    /** Active/pressed state */
    isActive?: boolean;
    /** Disabled state */
    disabled?: boolean;
    /** Loading state - shows spinner */
    isLoading?: boolean;
    /** Keyboard shortcut to display in tooltip */
    shortcut?: string;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Accessible IconButton with consistent styling, focus states, and loading support.
 * 
 * @example
 * // Basic usage
 * <IconButton icon={Save} label="Save document" onClick={handleSave} />
 * 
 * // With loading state
 * <IconButton icon={Upload} label="Upload file" isLoading={uploading} onClick={upload} />
 * 
 * // Danger variant
 * <IconButton icon={Trash2} label="Delete item" variant="danger" onClick={handleDelete} />
 * 
 * // With keyboard shortcut
 * <IconButton icon={Undo2} label="Undo" shortcut="Ctrl+Z" onClick={undo} />
 */
export function IconButton({
    icon: IconComponent,
    label,
    onClick,
    size = 'md',
    weight = 'regular',
    variant = 'ghost',
    isActive,
    disabled,
    isLoading,
    shortcut,
    className,
}: IconButtonProps) {
    const tooltipText = shortcut ? `${label} (${shortcut})` : label;
    const ariaLabel = shortcut ? `${label}, keyboard shortcut ${shortcut}` : label;

    return (
        <button
            onClick={onClick}
            disabled={disabled || isLoading}
            aria-label={ariaLabel}
            aria-pressed={isActive}
            aria-busy={isLoading}
            title={tooltipText}
            className={cn(
                // Base styles
                'relative inline-flex items-center justify-center',
                'p-2 rounded-lg transition-all duration-150',
                // Focus styles (accessibility)
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
                // Variant styles
                BUTTON_VARIANTS[variant],
                // Active state override
                isActive && 'bg-blue-100 text-blue-600 hover:bg-blue-150',
                // Disabled state
                (disabled || isLoading) && 'opacity-50 cursor-not-allowed pointer-events-none',
                className
            )}
        >
            {isLoading ? (
                <Loader2
                    className={cn(ICON_SIZES[size], 'animate-spin')}
                    strokeWidth={ICON_WEIGHTS[weight]}
                    aria-hidden="true"
                />
            ) : (
                <IconComponent
                    className={ICON_SIZES[size]}
                    strokeWidth={ICON_WEIGHTS[weight]}
                    aria-hidden="true"
                />
            )}
            {/* Screen reader text */}
            <span className="sr-only">{label}</span>
        </button>
    );
}

/**
 * IconButton with text label visible
 */
interface IconButtonWithTextProps extends IconButtonProps {
    /** Show text label next to icon */
    showLabel?: boolean;
}

export function IconButtonWithText({
    icon: IconComponent,
    label,
    onClick,
    size = 'md',
    weight = 'regular',
    variant = 'ghost',
    isActive,
    disabled,
    isLoading,
    shortcut,
    showLabel = true,
    className,
}: IconButtonWithTextProps) {
    const tooltipText = shortcut ? `${label} (${shortcut})` : label;

    return (
        <button
            onClick={onClick}
            disabled={disabled || isLoading}
            aria-label={label}
            aria-pressed={isActive}
            title={tooltipText}
            className={cn(
                'inline-flex items-center gap-2',
                'px-3 py-2 rounded-lg transition-all duration-150',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
                BUTTON_VARIANTS[variant],
                isActive && 'bg-blue-100 text-blue-600',
                (disabled || isLoading) && 'opacity-50 cursor-not-allowed',
                className
            )}
        >
            {isLoading ? (
                <Loader2
                    className={cn(ICON_SIZES[size], 'animate-spin')}
                    aria-hidden="true"
                />
            ) : (
                <IconComponent
                    className={ICON_SIZES[size]}
                    strokeWidth={ICON_WEIGHTS[weight]}
                    aria-hidden="true"
                />
            )}
            {showLabel && (
                <span className="text-sm font-medium">{label}</span>
            )}
        </button>
    );
}
