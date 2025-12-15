'use client';

import { cn } from '@/lib/utils';

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-3',
};

/**
 * Spinner - Animated loading spinner
 */
export function Spinner({ size = 'md', className }: SpinnerProps) {
    return (
        <div
            className={cn(
                'border-blue-500 border-t-transparent rounded-full animate-spin',
                sizeClasses[size],
                className
            )}
        />
    );
}

interface LoadingOverlayProps {
    message?: string;
}

/**
 * LoadingOverlay - Full overlay with spinner and optional message
 */
export function LoadingOverlay({ message = 'Loading...' }: LoadingOverlayProps) {
    return (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-50">
            <div className="flex flex-col items-center gap-3">
                <Spinner size="lg" />
                <span className="text-sm text-gray-600 font-medium">{message}</span>
            </div>
        </div>
    );
}

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean;
    children: React.ReactNode;
}

/**
 * LoadingButton - Button with loading spinner
 */
export function LoadingButton({ isLoading, children, className, disabled, ...props }: LoadingButtonProps) {
    return (
        <button
            className={cn(
                'relative flex items-center justify-center gap-2 px-4 py-2 rounded-md',
                'bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed',
                className
            )}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && <Spinner size="sm" className="border-white border-t-transparent" />}
            {children}
        </button>
    );
}
