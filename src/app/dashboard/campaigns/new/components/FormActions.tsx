'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCampaignWizard } from '@/lib/campaigns/CampaignWizardContext';
import { createCampaign } from '@/lib/db/campaigns';
import { toast } from 'sonner';

interface FormActionsProps {
    className?: string;
}

export function FormActions({ className }: FormActionsProps) {
    const router = useRouter();
    const { 
        campaignName, 
        csvData, 
        selectedTemplate, 
        fieldMapping,
        isFormValid,
        getValidationErrors 
    } = useCampaignWizard();
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleBack = () => {
        router.push('/dashboard/campaigns');
    };

    const handleSubmit = async () => {
        // Final validation
        const errors = getValidationErrors();
        if (errors.length > 0) {
            toast.error('Please fix the following issues:', {
                description: errors.join(', ')
            });
            return;
        }

        if (!csvData || !selectedTemplate) {
            toast.error('Missing required data');
            return;
        }

        setIsSubmitting(true);

        try {
            const campaign = await createCampaign({
                name: campaignName.trim(),
                template_id: selectedTemplate.id,
                csv_data: csvData.rows,
                field_mapping: fieldMapping,
                total_pins: csvData.rowCount
            });

            if (campaign) {
                toast.success('Campaign created successfully!');
                router.push(`/dashboard/campaigns/${campaign.id}`);
            } else {
                throw new Error('Failed to create campaign');
            }
        } catch (error) {
            console.error('Error creating campaign:', error);
            toast.error('Failed to create campaign', {
                description: 'Please try again or contact support if the issue persists.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const canSubmit = isFormValid() && !isSubmitting;

    return (
        <div className={cn(
            "flex items-center justify-between pt-6 mt-6 border-t border-gray-200",
            className
        )}>
            {/* Back Button */}
            <button
                onClick={handleBack}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
            </button>

            {/* Create Campaign Button */}
            <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={cn(
                    "flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all",
                    canSubmit
                        ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                    </>
                ) : (
                    <>
                        Create Campaign
                        <Rocket className="w-4 h-4" />
                    </>
                )}
            </button>
        </div>
    );
}
