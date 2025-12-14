'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
    /** Custom title for the error message */
    title?: string;
    /** Show retry button - defaults to true */
    showRetry?: boolean;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

/**
 * React Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in child component tree,
 * logs those errors, and displays a fallback UI.
 * 
 * @example
 * <ErrorBoundary title="Canvas Error" onError={logToService}>
 *   <CanvasEditor />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        this.setState({ errorInfo });

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error('[ErrorBoundary] Caught error:', error);
            console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
        }

        // Call custom error handler if provided
        this.props.onError?.(error, errorInfo);
    }

    handleRetry = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render(): ReactNode {
        const { hasError, error } = this.state;
        const { children, fallback, title = 'Something went wrong', showRetry = true } = this.props;

        if (hasError) {
            // Use custom fallback if provided
            if (fallback) {
                return fallback;
            }

            // Default error UI
            return (
                <div className="flex flex-col items-center justify-center min-h-[300px] p-8 bg-red-50 border border-red-200 rounded-xl">
                    <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                    <h2 className="text-lg font-semibold text-red-900 mb-2">
                        {title}
                    </h2>
                    <p className="text-sm text-red-700 text-center max-w-md mb-4">
                        {error?.message || 'An unexpected error occurred while rendering this component.'}
                    </p>
                    {showRetry && (
                        <button
                            onClick={this.handleRetry}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Try Again
                        </button>
                    )}
                    {process.env.NODE_ENV === 'development' && error && (
                        <details className="mt-4 w-full max-w-lg">
                            <summary className="text-sm text-red-600 cursor-pointer hover:text-red-800">
                                Show error details
                            </summary>
                            <pre className="mt-2 p-3 bg-red-100 rounded text-xs overflow-auto text-red-900">
                                {error.stack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return children;
    }
}

/**
 * Canvas-specific Error Boundary with tailored messaging
 */
export function CanvasErrorBoundary({ children }: { children: ReactNode }) {
    return (
        <ErrorBoundary
            title="Canvas Rendering Error"
            onError={(error) => {
                // Could send to error tracking service here
                console.error('[CanvasErrorBoundary] Canvas crashed:', error.message);
            }}
        >
            {children}
        </ErrorBoundary>
    );
}

export default ErrorBoundary;
