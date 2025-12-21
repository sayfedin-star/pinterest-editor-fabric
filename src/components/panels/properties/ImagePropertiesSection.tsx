'use client';

import React, { memo, useCallback } from 'react';
import { ImageElement } from '@/types/editor';
import { SectionHeader } from './shared';
import { useEditorStore } from '@/stores/editorStore';
import { 
    Maximize2, 
    Minimize2, 
    Move 
} from 'lucide-react';

interface ImagePropertiesSectionProps {
    element: ImageElement;
}

type FitMode = 'cover' | 'contain' | 'fill';

const fitModeOptions: { value: FitMode; label: string; icon: React.ReactNode; description: string }[] = [
    { 
        value: 'contain', 
        label: 'Contain', 
        icon: <Minimize2 className="w-4 h-4" />,
        description: 'Show full image'
    },
    { 
        value: 'cover', 
        label: 'Cover', 
        icon: <Maximize2 className="w-4 h-4" />,
        description: 'Fill frame, crop excess'
    },
    { 
        value: 'fill', 
        label: 'Fill', 
        icon: <Move className="w-4 h-4" />,
        description: 'Stretch to fit'
    },
];

/**
 * ImagePropertiesSection - Image-specific controls including fit mode
 */
export const ImagePropertiesSection = memo(function ImagePropertiesSection({ element }: ImagePropertiesSectionProps) {
    const updateElement = useEditorStore((state) => state.updateElement);
    
    // Subscribe to editorStore to get live updates when fitMode changes
    const currentElement = useEditorStore((state) => 
        state.elements.find(el => el.id === element.id) as ImageElement | undefined
    );
    
    const handleFitModeChange = useCallback((mode: FitMode) => {
        updateElement(element.id, { fitMode: mode });
    }, [element.id, updateElement]);
    
    // Use live element from store, fallback to prop
    const liveElement = currentElement || element;
    const currentFitMode = liveElement.fitMode || 'contain';
    
    return (
        <div className="space-y-4">
            <SectionHeader title="IMAGE" />
            
            {/* Fit Mode Selector */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600">Fit Mode</label>
                <div className="grid grid-cols-3 gap-1">
                    {fitModeOptions.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => handleFitModeChange(option.value)}
                            className={`
                                flex flex-col items-center justify-center p-2 rounded-md
                                border transition-all duration-150
                                ${currentFitMode === option.value 
                                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                }
                            `}
                            title={option.description}
                        >
                            {option.icon}
                            <span className="text-[10px] mt-1 font-medium">{option.label}</span>
                        </button>
                    ))}
                </div>
                <p className="text-[10px] text-gray-400">
                    {fitModeOptions.find(o => o.value === currentFitMode)?.description}
                </p>
            </div>
            
            {/* Dynamic Image Indicator */}
            {liveElement.isDynamic && (
                <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-md border border-purple-200">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="text-xs text-purple-700">
                        Dynamic: {liveElement.dynamicSource || 'unmapped'}
                    </span>
                </div>
            )}
        </div>
    );
});

