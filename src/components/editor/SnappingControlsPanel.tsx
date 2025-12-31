'use client';

import React from 'react';
import { useSnappingSettingsStore } from '@/stores/snappingSettingsStore';
import {
    Magnet,
    RotateCcw,
} from 'lucide-react';

interface ToggleProps {
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
}

function Toggle({ label, checked, onChange, disabled }: ToggleProps) {
    return (
        <label
            className={`flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer transition-colors
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
        >
            <span className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>{label}</span>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => !disabled && onChange(!checked)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors
                    ${checked ? 'bg-pink-500' : 'bg-gray-300'}
                    ${disabled ? 'cursor-not-allowed' : ''}`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                        ${checked ? 'translate-x-4' : 'translate-x-0.5'}`}
                />
            </button>
        </label>
    );
}

export function SnappingControlsPanel() {
    const store = useSnappingSettingsStore();

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 w-64 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2">
                    <Magnet size={16} className="text-pink-500" />
                    <span className="font-medium text-gray-800 text-sm">Snapping</span>
                </div>
                <button
                    onClick={() => store.resetToDefaults()}
                    className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Reset to Defaults"
                >
                    <RotateCcw size={14} className="text-gray-500" />
                </button>
            </div>

            {/* Master Toggle */}
            <div className="px-3 py-2 border-b border-gray-100">
                <Toggle
                    label="Enable Snapping"
                    checked={store.enabled}
                    onChange={store.setEnabled}
                />
            </div>

            {/* Snap Options */}
            <div className="px-1 py-2 space-y-0.5">
                <Toggle
                    label="Object Centers"
                    checked={store.snapToObjectCenters}
                    onChange={store.setSnapToObjectCenters}
                    disabled={!store.enabled}
                />
                <Toggle
                    label="Object Edges"
                    checked={store.snapToObjectEdges}
                    onChange={store.setSnapToObjectEdges}
                    disabled={!store.enabled}
                />
                <Toggle
                    label="Canvas Center"
                    checked={store.snapToCanvasCenter}
                    onChange={store.setSnapToCanvasCenter}
                    disabled={!store.enabled}
                />
                <Toggle
                    label="Canvas Boundaries"
                    checked={store.snapToBoundaries}
                    onChange={store.setSnapToBoundaries}
                    disabled={!store.enabled}
                />
            </div>

            {/* Threshold Slider */}
            <div className={`px-4 py-3 border-t border-gray-100 ${!store.enabled ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-700">Snap Distance</span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{store.snapThreshold}px</span>
                </div>
                <input
                    type="range"
                    min={2}
                    max={20}
                    value={store.snapThreshold}
                    onChange={(e) => store.setSnapThreshold(Number(e.target.value))}
                    disabled={!store.enabled}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
            </div>

            {/* Guide Color */}
            <div className={`px-4 py-3 border-t border-gray-100 ${!store.enabled ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Guide Color</span>
                    <input
                        type="color"
                        value={store.guideColor}
                        onChange={(e) => store.setGuideColor(e.target.value)}
                        disabled={!store.enabled}
                        className="w-8 h-6 rounded border border-gray-200 cursor-pointer"
                    />
                </div>
            </div>

            {/* Keyboard Hint */}
            <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 border-t border-gray-100">
                Hold <kbd className="px-1 bg-gray-200 rounded">Shift</kbd> to temporarily disable
            </div>
        </div>
    );
}
