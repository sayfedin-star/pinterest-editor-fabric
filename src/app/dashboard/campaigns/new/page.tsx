'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { CampaignWizardProvider, useCampaignWizard } from '@/lib/campaigns/CampaignWizardContext';
import { 
    ConfigurationSidebar, 
    TemplateLibrarySection, 
    FieldMappingSection, 
    FormActions 
} from './components';

function SinglePageContent() {
    const router = useRouter();
    const { selectedTemplate } = useCampaignWizard();
    const fieldMappingRef = useRef<HTMLDivElement>(null);

    // Scroll to field mapping when template is selected
    const scrollToFieldMapping = () => {
        setTimeout(() => {
            fieldMappingRef.current?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 100);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Create Campaign</h1>
                        <p className="text-gray-600 text-sm mt-0.5">
                            Configure your new automated pin generation workflow
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/dashboard/campaigns')}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                        Cancel
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Two-column layout */}
                <div className="grid lg:grid-cols-12 gap-6">
                    {/* Left Sidebar - Configuration */}
                    <div className="lg:col-span-3">
                        <ConfigurationSidebar />
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-9 space-y-6">
                        {/* Template Library */}
                        <TemplateLibrarySection 
                            onTemplateSelect={scrollToFieldMapping}
                        />

                        {/* Field Mapping (conditional) */}
                        {selectedTemplate && (
                            <div ref={fieldMappingRef}>
                                <FieldMappingSection />
                            </div>
                        )}
                    </div>
                </div>

                {/* Form Actions */}
                <FormActions />
            </main>
        </div>
    );
}

export default function NewCampaignPage() {
    const router = useRouter();
    const { currentUser, loading } = useAuth();

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !currentUser) {
            router.push('/login');
        }
    }, [loading, currentUser, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!currentUser) {
        return null;
    }

    return (
        <CampaignWizardProvider>
            <SinglePageContent />
        </CampaignWizardProvider>
    );
}

