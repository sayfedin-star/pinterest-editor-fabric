'use client';

import React from 'react';
import { Layers, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SelectionMode, MAX_TEMPLATES } from '@/lib/campaigns/CampaignWizardContext';

interface TemplateModeSelectorProps {
    mode: SelectionMode;
    onModeChange: (mode: SelectionMode) => void;
    selectedCount?: number;
}

/**
 * Toggle switch for selecting between single and multiple template modes
 */
export function TemplateModeSelector({ mode, onModeChange, selectedCount = 0 }: TemplateModeSelectorProps) {
    return (
        <div className="flex items-center gap-3">
            <div className="inline-flex items-center rounded-xl bg-gray-100 p-1">
                <button
                    type="button"
                    onClick={() => onModeChange('single')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                        mode === 'single'
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                    )}
                >
                    <LayoutGrid className="w-4 h-4" />
                    Single
                </button>
                <button
                    type="button"
                    onClick={() => onModeChange('multiple')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                        mode === 'multiple'
                            ? "bg-white text-blue-600 shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                    )}
                >
                    <Layers className="w-4 h-4" />
                    Multiple
                </button>
            </div>

            {/* Selection counter for multi-mode */}
            {mode === 'multiple' && (
                <span className={cn(
                    "text-sm font-medium px-3 py-1.5 rounded-full transition-colors",
                    selectedCount > 0 
                        ? "bg-blue-100 text-blue-700" 
                        : "bg-gray-100 text-gray-500"
                )}>
                    {selectedCount}/{MAX_TEMPLATES} selected
                </span>
            )}
        </div>
    );
}
