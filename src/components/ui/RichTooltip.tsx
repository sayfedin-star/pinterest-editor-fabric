'use client';

import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTooltipProps {
    /** Tooltip trigger element */
    children: React.ReactNode;
    /** Main tooltip label */
    label: string;
    /** Optional description text */
    description?: string;
    /** Keyboard shortcut to display */
    shortcut?: string;
    /** Optional icon for the tooltip */
    icon?: LucideIcon;
    /** Tooltip placement side */
    side?: 'top' | 'right' | 'bottom' | 'left';
    /** Offset from trigger */
    sideOffset?: number;
    /** Delay before showing */
    delayDuration?: number;
}

/**
 * Rich tooltip with icon, description, and keyboard shortcut support.
 * Built on Radix UI Tooltip for accessibility.
 * 
 * @example
 * // Basic usage
 * <RichTooltip label="Save document">
 *   <button><Save className="w-4 h-4" /></button>
 * </RichTooltip>
 * 
 * // With shortcut and description
 * <RichTooltip 
 *   label="Undo" 
 *   description="Revert the last action"
 *   shortcut="Ctrl+Z"
 * >
 *   <button><Undo2 className="w-4 h-4" /></button>
 * </RichTooltip>
 */
export function RichTooltip({
    children,
    label,
    description,
    shortcut,
    icon: Icon,
    side = 'top',
    sideOffset = 6,
    delayDuration = 300,
}: RichTooltipProps) {
    return (
        <TooltipPrimitive.Provider delayDuration={delayDuration}>
            <TooltipPrimitive.Root>
                <TooltipPrimitive.Trigger asChild>
                    {children}
                </TooltipPrimitive.Trigger>
                <TooltipPrimitive.Portal>
                    <TooltipPrimitive.Content
                        side={side}
                        sideOffset={sideOffset}
                        className={cn(
                            'z-50 px-3 py-2 rounded-lg shadow-xl',
                            'bg-gray-900 text-white',
                            'animate-in fade-in-0 zoom-in-95',
                            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
                            'max-w-xs'
                        )}
                    >
                        <div className="flex items-start gap-2">
                            {Icon && (
                                <Icon className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" aria-hidden="true" />
                            )}
                            <div className="flex-1">
                                <div className="font-medium text-sm">{label}</div>
                                {description && (
                                    <div className="text-xs text-gray-400 mt-1">
                                        {description}
                                    </div>
                                )}
                                {shortcut && (
                                    <div className="flex items-center gap-1 mt-2">
                                        {shortcut.split('+').map((key, i) => (
                                            <React.Fragment key={key}>
                                                {i > 0 && <span className="text-gray-500">+</span>}
                                                <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs font-mono">
                                                    {key}
                                                </kbd>
                                            </React.Fragment>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <TooltipPrimitive.Arrow className="fill-gray-900" />
                    </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
            </TooltipPrimitive.Root>
        </TooltipPrimitive.Provider>
    );
}

/**
 * Simple tooltip for basic use cases
 */
export function Tooltip({
    children,
    content,
    side = 'top',
    sideOffset = 4,
}: {
    children: React.ReactNode;
    content: string;
    side?: 'top' | 'right' | 'bottom' | 'left';
    sideOffset?: number;
}) {
    return (
        <TooltipPrimitive.Provider delayDuration={200}>
            <TooltipPrimitive.Root>
                <TooltipPrimitive.Trigger asChild>
                    {children}
                </TooltipPrimitive.Trigger>
                <TooltipPrimitive.Portal>
                    <TooltipPrimitive.Content
                        side={side}
                        sideOffset={sideOffset}
                        className={cn(
                            'z-50 px-2 py-1 rounded-md shadow-lg',
                            'bg-gray-900 text-white text-xs',
                            'animate-in fade-in-0 zoom-in-95'
                        )}
                    >
                        {content}
                        <TooltipPrimitive.Arrow className="fill-gray-900" />
                    </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
            </TooltipPrimitive.Root>
        </TooltipPrimitive.Provider>
    );
}
