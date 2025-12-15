'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
}

/**
 * Skeleton - Animated loading placeholder
 * 
 * Uses a shimmer animation to indicate loading state.
 * Can be customized with className for different sizes/shapes.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
    return (
        <div
            className={cn(
                'animate-pulse rounded-md bg-gray-200',
                className
            )}
            {...props}
        />
    );
}

/**
 * TemplateSkeleton - Loading state for template list items
 */
export function TemplateSkeleton() {
    return (
        <div className="p-3 border-b border-gray-100 space-y-2">
            {/* Thumbnail placeholder */}
            <Skeleton className="h-24 w-full rounded-lg" />
            {/* Title placeholder */}
            <Skeleton className="h-4 w-3/4" />
            {/* Date placeholder */}
            <Skeleton className="h-3 w-1/2" />
        </div>
    );
}

/**
 * TemplateListSkeleton - Loading state for entire template list
 */
export function TemplateListSkeleton() {
    return (
        <div className="space-y-0">
            <TemplateSkeleton />
            <TemplateSkeleton />
            <TemplateSkeleton />
        </div>
    );
}

/**
 * LayerSkeleton - Loading state for a single layer item
 */
export function LayerSkeleton() {
    return (
        <div className="flex items-center gap-2 p-2 border-b border-gray-100">
            {/* Icon placeholder */}
            <Skeleton className="h-4 w-4 rounded" />
            {/* Name placeholder */}
            <Skeleton className="h-4 flex-1" />
            {/* Action buttons placeholder */}
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-4 rounded" />
        </div>
    );
}

/**
 * LayerListSkeleton - Loading state for layers panel
 */
export function LayerListSkeleton() {
    return (
        <div className="space-y-0">
            <LayerSkeleton />
            <LayerSkeleton />
            <LayerSkeleton />
            <LayerSkeleton />
        </div>
    );
}

/**
 * PropertySkeleton - Loading state for properties panel
 */
export function PropertySkeleton() {
    return (
        <div className="space-y-4 p-4">
            {/* Section header */}
            <Skeleton className="h-5 w-24" />
            {/* Input fields */}
            <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
            </div>
            {/* Divider */}
            <Skeleton className="h-px w-full" />
            {/* Another section */}
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-9 w-full" />
        </div>
    );
}

/**
 * CanvasSkeleton - Loading state for canvas area
 */
export function CanvasSkeleton() {
    return (
        <div className="flex-1 flex items-center justify-center bg-gray-100">
            <div className="flex flex-col items-center gap-4">
                {/* Canvas placeholder */}
                <Skeleton className="h-[400px] w-[300px] rounded-lg" />
                {/* Loading text */}
                <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-gray-500">Loading canvas...</span>
                </div>
            </div>
        </div>
    );
}

/**
 * ButtonSkeleton - Loading state for a button
 */
export function ButtonSkeleton({ className }: { className?: string }) {
    return <Skeleton className={cn('h-9 w-20', className)} />;
}

/**
 * CardSkeleton - Loading state for a card
 */
export function CardSkeleton() {
    return (
        <div className="border rounded-lg p-4 space-y-3">
            <Skeleton className="h-32 w-full rounded-md" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
        </div>
    );
}
