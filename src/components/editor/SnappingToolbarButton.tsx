'use client';

import React, { useState } from 'react';
import { useSnappingSettingsStore } from '@/stores/snappingSettingsStore';
import { SnappingControlsPanel } from './SnappingControlsPanel';
import { Magnet, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SnappingToolbarButton() {
    const [isOpen, setIsOpen] = useState(false);
    const magneticSnapping = useSnappingSettingsStore((s) => s.magneticSnapping);
    const setMagneticSnapping = useSnappingSettingsStore((s) => s.setMagneticSnapping);

    return (
        <div className="relative">
            {/* Main Button */}
            <div className="flex items-center gap-0.5">
                <button
                    onClick={() => setMagneticSnapping(!magneticSnapping)}
                    className={cn(
                        "flex items-center justify-center w-7 h-7 rounded-md transition-all duration-150",
                        magneticSnapping
                            ? "bg-pink-100 text-pink-600 hover:bg-pink-200"
                            : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    )}
                    title={magneticSnapping ? 'Snapping On' : 'Snapping Off'}
                >
                    <Magnet className="w-4 h-4" />
                </button>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "flex items-center justify-center w-5 h-7 rounded-md transition-all duration-150",
                        "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                    )}
                    title="Snapping Settings"
                >
                    <ChevronUp className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
                </button>
            </div>

            {/* Dropdown Panel - Opens UPWARD */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute bottom-full right-0 mb-2 z-50">
                        <SnappingControlsPanel />
                    </div>
                </>
            )}
        </div>
    );
}
