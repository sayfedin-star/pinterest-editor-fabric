'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CampaignsTable } from '@/components/campaign/CampaignsTable';
import {
    Plus,
    Loader2,
    Sparkles,
    Upload,
    ArrowRight,
    Layout,
    Link2
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getCampaigns, CampaignListItem } from '@/lib/db/campaigns';
import { isSupabaseConfigured } from '@/lib/supabase';

// Demo campaigns for when database is not configured
const demoCampaigns: CampaignListItem[] = [
    {
        id: 'demo-1',
        name: 'Summer Products 2025',
        template_id: 'demo-template',
        template_ids: ['demo-template'],
        distribution_mode: 'sequential',
        total_pins: 50,
        generated_pins: 50,
        status: 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: 'demo-2',
        name: 'Recipe Cards Batch',
        template_id: 'demo-template',
        template_ids: ['demo-template'],
        distribution_mode: 'sequential',
        total_pins: 25,
        generated_pins: 10,
        status: 'processing',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
];

// Skeleton loading card
function CampaignCardSkeleton() {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="h-6 w-48 bg-gray-200 rounded shimmer" />
                        <div className="h-6 w-20 bg-gray-100 rounded-full shimmer" />
                    </div>
                    <div className="h-4 w-32 bg-gray-100 rounded shimmer" />
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-center">
                        <div className="h-8 w-16 bg-gray-200 rounded shimmer mx-auto" />
                        <div className="h-3 w-12 bg-gray-100 rounded shimmer mt-1 mx-auto" />
                    </div>
                    <div className="w-32">
                        <div className="h-3 bg-gray-200 rounded-full shimmer" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CampaignsPage() {
    const router = useRouter();
    const { currentUser, loading: authLoading } = useAuth();

    const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !currentUser) {
            router.push('/login');
        }
    }, [authLoading, currentUser, router]);

    // Fetch campaigns
    const fetchCampaigns = React.useCallback(async () => {
        if (!currentUser) return;

        setIsLoading(true);
        try {
            if (isSupabaseConfigured()) {
                const data = await getCampaigns();
                setCampaigns(data);
            } else {
                setCampaigns(demoCampaigns);
            }
        } catch (error) {
            console.error('Error fetching campaigns:', error);
            setCampaigns(demoCampaigns);
        } finally {
            setIsLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchCampaigns();
    }, [fetchCampaigns]);

    if (authLoading || !currentUser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // Prepare data for the table
    const tableData = campaigns.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status as any, // Cast to match strict literal types if needed
        generated: c.generated_pins,
        totalPins: c.total_pins,
        createdAt: c.created_at
    }));

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Note: Header is now provided by DashboardLayout via PageHeader */}
            {/* We might want to customize PageHeader dynamically in the future, but for now we rely on the default one or context */}
            
            <div className="max-w-6xl mx-auto">
                {/* Skeleton Loading State */}
                {isLoading ? (
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <CampaignCardSkeleton key={i} />
                        ))}
                    </div>
                ) : campaigns.length === 0 ? (
                    /* Enhanced Empty State */
                    <div className="bg-linear-to-br from-white to-gray-50 rounded-2xl border-2 border-dashed border-gray-300 p-12">
                        <div className="max-w-lg mx-auto text-center">
                            <div className="w-20 h-20 mx-auto rounded-2xl bg-linear-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-6">
                                <Sparkles className="w-10 h-10 text-blue-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-3">Create Your First Campaign</h3>
                            <p className="text-gray-600 mb-8">
                                Transform your data into beautiful pins at scale.
                                Just upload a CSV, pick a template, and let us do the rest.
                            </p>

                            {/* Workflow Steps */}
                            <div className="flex items-center justify-center gap-3 mb-8">
                                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg text-sm text-blue-700">
                                    <Upload className="w-4 h-4" />
                                    <span>Upload CSV</span>
                                </div>
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                                <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg text-sm text-purple-700">
                                    <Layout className="w-4 h-4" />
                                    <span>Pick Template</span>
                                </div>
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg text-sm text-green-700">
                                    <Link2 className="w-4 h-4" />
                                    <span>Map Fields</span>
                                </div>
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg text-sm text-amber-700">
                                    <Sparkles className="w-4 h-4" />
                                    <span>Generate!</span>
                                </div>
                            </div>

                            <Link
                                href="/dashboard/campaigns/new"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:-translate-y-0.5"
                            >
                                <Plus className="w-5 h-5" />
                                Start Your First Campaign
                            </Link>
                        </div>
                    </div>
                ) : (
                    /* Campaigns Table */
                    <CampaignsTable campaigns={tableData} onRefresh={fetchCampaigns} />
                )}
            </div>
        </div>
    );
}
