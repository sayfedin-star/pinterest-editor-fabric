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
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                <PageHeader />
                
                <main className="flex-1 p-6 md:p-8">
                    <div className="max-w-7xl mx-auto space-y-6">
                        {children}
                    </div>
                </main>
            </div>

            {/* Onboarding Checklist - Fixed/Absolute usually, keeping it */}
            <OnboardingChecklist />
        </div>
    );
}
