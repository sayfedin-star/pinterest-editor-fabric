'use client';

import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { ErrorBoundary } from 'react-error-boundary';
import { Header } from '@/components/layout/Header';
import { CollapsibleSidebar } from '@/components/layout/CollapsibleSidebar';
import { LeftSidebar } from '@/components/layout/LeftSidebar';
import { Toolbar } from '@/components/layout/Toolbar';
import { CanvasArea } from '@/components/layout/CanvasArea';
import { RightPanel } from '@/components/layout/RightPanel';

import { KeyboardShortcutsModal, useKeyboardShortcutsModal } from '@/components/ui/KeyboardShortcutsModal';
import { DesktopOnlyMessage, useIsMobile } from '@/components/ui/DesktopOnlyMessage';
import { CanvasErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { ErrorFallback, PanelErrorFallback } from '@/components/errors';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTemplateFromUrl } from '@/hooks/useTemplateFromUrl';
import { useAuth } from '@/lib/auth/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * Log errors to console (and future: error tracking service)
 */
function logError(error: Error, info: { componentStack?: string | null }) {
    console.error('[EditorPage] Error caught by boundary:', error);
    if (info.componentStack) {
        console.error('[EditorPage] Component stack:', info.componentStack);
    }
    // Future: Send to Sentry, LogRocket, etc.
}

// Inner component that uses useSearchParams (requires Suspense)
function EditorContent() {
    const router = useRouter();
    const { currentUser, loading } = useAuth();
    const isMobile = useIsMobile();

    // Initialize keyboard shortcuts
    useKeyboardShortcuts();
    
    // Load template from URL parameter (e.g., ?template=abc123)
    useTemplateFromUrl();

    // Keyboard shortcuts modal
    const { isOpen: isShortcutsOpen, close: closeShortcuts } = useKeyboardShortcutsModal();



    // Redirect to login if not authenticated
    useEffect(() => {
        if (!loading && !currentUser) {
            router.push('/login');
        }
    }, [loading, currentUser, router]);

    // Show loading while checking auth
    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-100">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // Don't render editor if not authenticated (will redirect)
    if (!currentUser) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-100">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // Show mobile message on small screens
    if (isMobile) {
        return <DesktopOnlyMessage featureName="Template Editor" />;
    }

    return (
        <ErrorBoundary FallbackComponent={ErrorFallback} onError={logError}>
            <div className="h-screen flex overflow-hidden bg-gray-100">
                {/* Main Dashboard Sidebar */}
                <CollapsibleSidebar />

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    {/* Header */}
                    <Header />

                    {/* Editor Workspace */}
                    <div className="flex-1 flex overflow-hidden">
                        {/* Left Sidebar - Wrapped for isolation */}
                        <ErrorBoundary FallbackComponent={PanelErrorFallback} onError={logError}>
                            <LeftSidebar />
                        </ErrorBoundary>

                        {/* Center Area */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Toolbar */}
                            <Toolbar />

                            {/* Canvas - Wrapped with Error Boundary */}
                            <CanvasErrorBoundary>
                                <CanvasArea />
                            </CanvasErrorBoundary>
                        </div>

                        {/* Right Panel - Wrapped for isolation */}
                        <ErrorBoundary FallbackComponent={PanelErrorFallback} onError={logError}>
                            <RightPanel />
                        </ErrorBoundary>
                    </div>
                </div>

                {/* Keyboard Shortcuts Modal */}
                <KeyboardShortcutsModal isOpen={isShortcutsOpen} onClose={closeShortcuts} />

                {/* Toast Notifications */}
                <ToastContainer />
            </div>
        </ErrorBoundary>
    );
}

// Main export with Suspense for useSearchParams
export default function EditorPage() {
    return (
        <Suspense fallback={
            <div className="h-screen flex items-center justify-center bg-gray-100">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        }>
            <EditorContent />
        </Suspense>
    );
}
