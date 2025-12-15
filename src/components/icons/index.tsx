import React from 'react';
import { cn } from '@/lib/utils';

interface CustomIconProps {
    className?: string;
    'aria-label'?: string;
}

/**
 * Custom Distribute Horizontal icon
 * Shows three rectangles distributed horizontally
 */
export function DistributeHorizontal({ className, 'aria-label': ariaLabel }: CustomIconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn('w-4 h-4', className)}
            aria-label={ariaLabel}
            aria-hidden={!ariaLabel}
        >
            <rect x="2" y="8" width="4" height="8" rx="1" />
            <rect x="10" y="6" width="4" height="12" rx="1" />
            <rect x="18" y="8" width="4" height="8" rx="1" />
        </svg>
    );
}

/**
 * Custom Distribute Vertical icon
 * Shows three rectangles distributed vertically
 */
export function DistributeVertical({ className, 'aria-label': ariaLabel }: CustomIconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn('w-4 h-4', className)}
            aria-label={ariaLabel}
            aria-hidden={!ariaLabel}
        >
            <rect x="8" y="2" width="8" height="4" rx="1" />
            <rect x="6" y="10" width="12" height="4" rx="1" />
            <rect x="8" y="18" width="8" height="4" rx="1" />
        </svg>
    );
}

/**
 * Pinterest logo icon
 */
export function PinterestIcon({ className, 'aria-label': ariaLabel }: CustomIconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className={cn('w-6 h-6', className)}
            aria-label={ariaLabel || 'Pinterest'}
            role="img"
        >
            <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
        </svg>
    );
}

/**
 * Canva logo icon
 */
export function CanvaIcon({ className, 'aria-label': ariaLabel }: CustomIconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className={cn('w-6 h-6', className)}
            aria-label={ariaLabel || 'Canva'}
            role="img"
        >
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 17.954c-.705.705-1.595 1.057-2.67 1.057-.894 0-1.679-.264-2.355-.792-.677-.529-1.198-1.293-1.563-2.293-.366-1-.549-2.181-.549-3.544 0-1.362.183-2.544.549-3.544.365-1 .886-1.764 1.563-2.293.676-.528 1.461-.792 2.355-.792 1.075 0 1.965.352 2.67 1.057.705.705 1.057 1.595 1.057 2.67 0 .894-.264 1.68-.792 2.355-.529.677-1.293 1.198-2.293 1.563-1 .366-2.181.549-3.544.549-1.362 0-2.543-.183-3.543-.549-1-.365-1.764-.886-2.293-1.563-.529-.676-.793-1.461-.793-2.355 0-1.075.352-1.965 1.057-2.67.706-.705 1.596-1.057 2.67-1.057.895 0 1.68.264 2.356.792.676.529 1.197 1.293 1.563 2.293.365 1 .548 2.182.548 3.544 0 1.363-.183 2.544-.548 3.544-.366 1-.887 1.764-1.563 2.293-.677.528-1.461.792-2.356.792-1.074 0-1.964-.352-2.67-1.057z" />
        </svg>
    );
}

/**
 * Sparkle icon for AI/Magic features
 */
export function SparkleIcon({ className, 'aria-label': ariaLabel }: CustomIconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn('w-4 h-4', className)}
            aria-label={ariaLabel}
            aria-hidden={!ariaLabel}
        >
            <path d="M12 3L13.5 8.5L19 10L13.5 11.5L12 17L10.5 11.5L5 10L10.5 8.5L12 3Z" />
            <path d="M19 18L19.5 20L21 20.5L19.5 21L19 23L18.5 21L17 20.5L18.5 20L19 18Z" />
            <path d="M5 2L5.5 4L7 4.5L5.5 5L5 7L4.5 5L3 4.5L4.5 4L5 2Z" />
        </svg>
    );
}

/**
 * Grid/Template icon
 */
export function TemplateGridIcon({ className, 'aria-label': ariaLabel }: CustomIconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn('w-4 h-4', className)}
            aria-label={ariaLabel}
            aria-hidden={!ariaLabel}
        >
            <rect x="3" y="3" width="7" height="9" rx="1" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" />
            <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
    );
}
