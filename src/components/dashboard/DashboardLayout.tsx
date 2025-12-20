import { ReactNode } from 'react';
import { CollapsibleSidebar } from '@/components/layout/CollapsibleSidebar';
import { PageHeader } from '@/components/layout/PageHeader';
import { OnboardingChecklist } from '@/components/ui/OnboardingChecklist';

interface DashboardLayoutProps {
    children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar - Sticky & Collapsible */}
            <CollapsibleSidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 bg-canvas-light dark:bg-canvas-dark">
                <PageHeader />
                
                {/* Main allows full width/height for children like DashboardPage */}
                <div className="flex-1 flex flex-col min-h-0">
                    {children}
                </div>
            </div>

            {/* Onboarding Checklist - Fixed/Absolute usually, keeping it */}
            <OnboardingChecklist />
        </div>
    );
}
