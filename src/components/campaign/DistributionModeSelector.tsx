'use client';

import React from 'react';
import { ArrowRight, Shuffle, SplitSquareHorizontal, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DistributionMode } from '@/types/database.types';

interface DistributionModeSelectorProps {
    mode: DistributionMode;
    onModeChange: (mode: DistributionMode) => void;
    templateCount: number;
    disabled?: boolean;
}

interface DistributionOption {
    value: DistributionMode;
    label: string;
    description: string;
    icon: React.ReactNode;
    preview: string[];
}

const distributionOptions: DistributionOption[] = [
    {
        value: 'sequential',
        label: 'Sequential',
        description: 'Templates cycle in order (A, B, A, B...)',
        icon: <ArrowRight className="w-5 h-5" />,
        preview: ['A', 'B', 'A', 'B', 'A', 'B'],
    },
    {
        value: 'random',
        label: 'Random',
        description: 'Templates assigned randomly',
        icon: <Shuffle className="w-5 h-5" />,
        preview: ['B', 'A', 'B', 'B', 'A', 'B'],
    },
    {
        value: 'equal',
        label: 'Equal Split',
        description: 'Divide rows evenly between templates',
        icon: <SplitSquareHorizontal className="w-5 h-5" />,
        preview: ['A', 'A', 'A', '|', 'B', 'B', 'B'],
    },
    {
        value: 'csv_column',
        label: 'CSV Column',
        description: 'Use "template" column in CSV',
        icon: <FileSpreadsheet className="w-5 h-5" />,
        preview: ['csv', '→', 'template'],
    },
];

/**
 * Radio group for selecting how templates are distributed across CSV rows
 */
export function DistributionModeSelector({ 
    mode, 
    onModeChange, 
    templateCount,
    disabled = false 
}: DistributionModeSelectorProps) {
    // Only show when there are multiple templates
    if (templateCount <= 1) return null;

    return (
        <div className="space-y-3">
            <div>
                <h4 className="text-sm font-medium text-gray-900">Distribution Mode</h4>
                <p className="text-xs text-gray-500 mt-0.5">
                    How templates are assigned to each CSV row
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {distributionOptions.map((option) => {
                    const isSelected = mode === option.value;
                    
                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onModeChange(option.value)}
                            disabled={disabled}
                            className={cn(
                                "group relative flex flex-col p-4 rounded-xl border-2 text-left transition-all duration-200",
                                "focus:outline-none focus:ring-2 focus:ring-blue-500/30",
                                isSelected
                                    ? "border-blue-500 bg-blue-50/50"
                                    : "border-gray-200 hover:border-gray-300 bg-white",
                                disabled && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {/* Header */}
                            <div className="flex items-start gap-3 mb-2">
                                <div className={cn(
                                    "p-2 rounded-lg transition-colors",
                                    isSelected ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"
                                )}>
                                    {option.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "font-medium text-sm",
                                            isSelected ? "text-blue-700" : "text-gray-900"
                                        )}>
                                            {option.label}
                                        </span>
                                        {isSelected && (
                                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {option.description}
                                    </p>
                                </div>
                            </div>

                            {/* Visual Preview */}
                            <div className="flex items-center gap-1 mt-auto pt-2 border-t border-gray-100">
                                {option.preview.map((item, idx) => (
                                    item === '|' ? (
                                        <div key={idx} className="w-px h-4 bg-gray-300 mx-1" />
                                    ) : item === '→' ? (
                                        <ArrowRight key={idx} className="w-3 h-3 text-gray-400" />
                                    ) : (
                                        <span
                                            key={idx}
                                            className={cn(
                                                "w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center",
                                                item === 'A' && "bg-purple-100 text-purple-600",
                                                item === 'B' && "bg-pink-100 text-pink-600",
                                                item === 'csv' && "bg-gray-100 text-gray-600 w-auto px-1.5",
                                                item === 'template' && "bg-blue-100 text-blue-600 w-auto px-1.5"
                                            )}
                                        >
                                            {item}
                                        </span>
                                    )
                                ))}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
