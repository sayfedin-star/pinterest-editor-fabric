'use client';

import React, { memo } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { TextElement } from '@/types/editor';
import { SectionHeader, StyleButton, SliderRow } from './shared';

interface EffectsSectionProps {
    element: TextElement;
}

export const EffectsSection = memo(function EffectsSection({ element }: EffectsSectionProps) {
    const updateElement = useEditorStore((s) => s.updateElement);
    const pushHistory = useEditorStore((s) => s.pushHistory);

    // Check which styles are currently enabled (can be multiple)
    const hasShadow = !!element.shadowColor;
    const hasOutline = !!element.stroke;

    // Toggle shadow effect
    const handleToggleShadow = () => {
        if (hasShadow) {
            // Disable shadow
            updateElement(element.id, {
                shadowColor: undefined,
                shadowBlur: undefined,
                shadowOffsetX: undefined,
                shadowOffsetY: undefined,
                shadowOpacity: undefined,
            });
        } else {
            // Enable shadow with defaults
            updateElement(element.id, {
                shadowColor: '#000000',
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowOffsetY: 4,
                shadowOpacity: 0.3,
            });
        }
        pushHistory();
    };

    // Toggle outline effect
    const handleToggleOutline = () => {
        if (hasOutline) {
            // Disable outline
            updateElement(element.id, {
                stroke: undefined,
                strokeWidth: undefined,
            });
        } else {
            // Enable outline with defaults
            updateElement(element.id, {
                stroke: '#000000',
                strokeWidth: 2,
            });
        }
        pushHistory();
    };

    return (
        <div className="space-y-6">
            <div>
                <SectionHeader title="STYLE" />
                <div className="space-y-2">
                    {/* Shadow Toggle */}
                    <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg">
                        <input
                            type="checkbox"
                            checked={hasShadow}
                            onChange={handleToggleShadow}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.2)' }} className="font-semibold text-lg">Aa</span>
                        <span className="text-sm text-gray-700">Shadow</span>
                    </label>

                    {/* Outline Toggle */}
                    <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg">
                        <input
                            type="checkbox"
                            checked={hasOutline}
                            onChange={handleToggleOutline}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span style={{ WebkitTextStroke: '1px #000' }} className="font-semibold text-lg">Aa</span>
                        <span className="text-sm text-gray-700">Outline</span>
                    </label>
                </div>
            </div>

            {/* Shadow Controls (shown when shadow is enabled) */}
            {hasShadow && (
                <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="text-xs font-medium text-gray-500 uppercase">Shadow Settings</div>
                    <SliderRow
                        label="Blur"
                        value={element.shadowBlur || 0}
                        min={0}
                        max={50}
                        onChange={(v) => updateElement(element.id, { shadowBlur: v })}
                        onDone={pushHistory}
                    />
                    <SliderRow
                        label="Offset X"
                        value={element.shadowOffsetX || 0}
                        min={-50}
                        max={50}
                        onChange={(v) => updateElement(element.id, { shadowOffsetX: v })}
                        onDone={pushHistory}
                    />
                    <SliderRow
                        label="Offset Y"
                        value={element.shadowOffsetY || 0}
                        min={-50}
                        max={50}
                        onChange={(v) => updateElement(element.id, { shadowOffsetY: v })}
                        onDone={pushHistory}
                    />
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 w-16">Color</label>
                        <input
                            type="color"
                            value={element.shadowColor || '#000000'}
                            onChange={(e) => {
                                updateElement(element.id, { shadowColor: e.target.value });
                                pushHistory();
                            }}
                            className="w-full h-8 rounded cursor-pointer"
                        />
                    </div>
                </div>
            )}

            {/* Outline Controls (shown when outline is enabled) */}
            {hasOutline && (
                <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="text-xs font-medium text-gray-500 uppercase">Outline Settings</div>
                    <SliderRow
                        label="Thickness"
                        value={element.strokeWidth || 2}
                        min={1}
                        max={20}
                        onChange={(v) => updateElement(element.id, { strokeWidth: v })}
                        onDone={pushHistory}
                    />
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 w-16">Color</label>
                        <input
                            type="color"
                            value={element.stroke || '#000000'}
                            onChange={(e) => {
                                updateElement(element.id, { stroke: e.target.value });
                                pushHistory();
                            }}
                            className="w-full h-8 rounded cursor-pointer"
                        />
                    </div>
                </div>
            )}

            <div>
                <SectionHeader title="SHAPE" />
                <div className="grid grid-cols-4 gap-2">
                    <StyleButton
                        label="None"
                        isActive={!element.curvedEnabled}
                        onClick={() => {
                            updateElement(element.id, { curvedEnabled: false });
                            pushHistory();
                        }}
                        preview={<span className="text-gray-400">abc</span>}
                    />
                    <StyleButton
                        label="Curved"
                        isActive={!!element.curvedEnabled}
                        onClick={() => {
                            updateElement(element.id, { curvedEnabled: true, curvedPower: 50 });
                            pushHistory();
                        }}
                        preview={
                            <svg width="24" height="20" viewBox="0 0 24 20" fill="none">
                                <path d="M2 15C5 8 12 5 22 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        }
                    />
                </div>
            </div>

            {element.curvedEnabled && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <SliderRow
                        label="Curve"
                        value={element.curvedPower || 50}
                        min={0}
                        max={100}
                        onChange={(v) => updateElement(element.id, { curvedPower: v })}
                        onDone={pushHistory}
                    />
                </div>
            )}
        </div>
    );
});
