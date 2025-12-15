'use client';

import { useEffect, useRef, useState } from 'react';
import { CanvasManager } from '@/lib/canvas/CanvasManager';
import { useSynchronizationBridge } from '@/hooks/useSynchronizationBridge';
import { useEditorStore } from '@/stores/editorStore';
import { Element } from '@/types/editor';

/**
 * Week 1 Proof-of-Concept Page
 * 
 * Demonstrates the new three-layer architecture with:
 * - CanvasManager (Layer 1) - owns Fabric.js
 * - SynchronizationBridge (Layer 2) - translates state
 * - React Components (Layer 3) - pure presentation
 * 
 * What Works:
 * ✅ Basic element rendering
 * ✅ Dragging with magnetic snapping
 * ✅ Selection works
 * ✅ Custom Canva-style handles
 * ✅ Performance monitoring
 * ✅ Canvas → React state sync
 * 
 * What Doesn't Work Yet:
 * ❌ Collision detection
 * ❌ ElementToolbar positioning
 * ❌ DimensionBadge
 * ❌ Undo/redo
 * ❌ React → Canvas sync
 */
export default function PrototypePage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const canvasManagerRef = useRef<CanvasManager | null>(null);
    const [initialized, setInitialized] = useState(false);
    const [metrics, setMetrics] = useState({ fps: 60, elementCount: 0 });

    // Get editor store methods
    const addElement = useEditorStore((state) => state.addElement);
    const elements = useEditorStore((state) => state.elements);

    // Activate synchronization bridge
    useSynchronizationBridge(canvasManagerRef.current);

    /**
     * Initialize canvas and create test elements
     */
    useEffect(() => {
        if (!canvasRef.current || initialized) return;

        console.log('[Prototype] Initializing canvas');

        // Create CanvasManager
        const manager = new CanvasManager();
        canvasManagerRef.current = manager;

        // Initialize with config
        manager.initialize(canvasRef.current, {
            width: 1000,
            height: 1500,
            backgroundColor: '#f5f5f5',
            zoom: 0.5, // Scale down to fit on screen
        });

        // Create 3 test elements
        const testElements: Element[] = [
            {
                id: 'test-rect-1',
                name: 'Red Rectangle',
                type: 'shape',
                shapeType: 'rect',
                x: 200,
                y: 300,
                width: 200,
                height: 150,
                rotation: 0,
                opacity: 1,
                locked: false,
                visible: true,
                zIndex: 0,
                fill: '#ff6b6b',
                stroke: '#c92a2a',
                strokeWidth: 2,
                cornerRadius: 8,
            },
            {
                id: 'test-rect-2',
                name: 'Blue Rectangle',
                type: 'shape',
                shapeType: 'rect',
                x: 500,
                y: 500,
                width: 250,
                height: 200,
                rotation: 0,
                opacity: 1,
                locked: false,
                visible: true,
                zIndex: 1,
                fill: '#4c6ef5',
                stroke: '#364fc7',
                strokeWidth: 2,
                cornerRadius: 8,
            },
            {
                id: 'test-circle-1',
                name: 'Green Circle',
                type: 'shape',
                shapeType: 'circle',
                x: 350,
                y: 800,
                width: 180,
                height: 180,
                rotation: 0,
                opacity: 1,
                locked: false,
                visible: true,
                zIndex: 2,
                fill: '#51cf66',
                stroke: '#2f9e44',
                strokeWidth: 2,
            },
        ];

        // Add elements to store only
        // SynchronizationBridge will sync them to CanvasManager
        testElements.forEach((element) => {
            addElement(element);
        });

        setInitialized(true);
        console.log('[Prototype] Initialization complete');

        // Update metrics every 2 seconds
        const metricsInterval = setInterval(() => {
            const currentMetrics = manager.getPerformanceMetrics();
            setMetrics({
                fps: currentMetrics.fps,
                elementCount: elements.length,
            });
        }, 2000);

        // Cleanup
        return () => {
            clearInterval(metricsInterval);
            if (canvasManagerRef.current) {
                canvasManagerRef.current.destroy();
                canvasManagerRef.current = null;
            }
        };
    }, [initialized, addElement, elements.length]);

    return (
        <div className="min-h-screen bg-gray-900 p-8">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">
                    Week 1 Proof-of-Concept
                </h1>
                <p className="text-gray-400">
                    New Three-Layer Architecture - CanvasManager + SynchronizationBridge + React UI
                </p>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Canvas Area */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                        <div className="bg-gray-800 px-6 py-3 border-b border-gray-700">
                            <h2 className="text-white font-semibold">Canvas (500x750 @ 50% zoom)</h2>
                        </div>
                        <div className="p-4 bg-gray-100">
                            <canvas
                                ref={canvasRef}
                                className="border border-gray-300 shadow-lg"
                            />
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="mt-6 bg-blue-900 border border-blue-700 rounded-lg p-6">
                        <h3 className="text-blue-100 font-semibold mb-3">📋 Test Instructions</h3>
                        <ul className="space-y-2 text-blue-200 text-sm">
                            <li>✓ <strong>Drag</strong> any element around the canvas</li>
                            <li>✓ <strong>Watch for guide lines</strong> when near center/edges (10px threshold)</li>
                            <li>✓ <strong>Feel the snap</strong> when within 5px of alignment</li>
                            <li>✓ <strong>Check console logs</strong> for CanvasManager events</li>
                            <li>✓ <strong>Monitor FPS</strong> in the metrics panel (should be 60)</li>
                            <li>✓ <strong>Verify state sync</strong> - element positions update in React state</li>
                        </ul>
                    </div>
                </div>

                {/* Metrics & Info Panel */}
                <div className="space-y-6">
                    {/* Performance Metrics */}
                    <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
                        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-3">
                            <h3 className="text-white font-semibold">Performance Metrics</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <div className="text-gray-400 text-sm mb-1">Frames Per Second</div>
                                <div className={`text-3xl font-bold ${metrics.fps >= 55 ? 'text-green-400' : 'text-red-400'}`}>
                                    {metrics.fps} FPS
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Target: 60 FPS | Minimum: 55 FPS
                                </div>
                            </div>

                            <div className="border-t border-gray-700 pt-4">
                                <div className="text-gray-400 text-sm mb-1">Element Count</div>
                                <div className="text-2xl font-bold text-blue-400">
                                    {metrics.elementCount}
                                </div>
                            </div>

                            <div className="border-t border-gray-700 pt-4">
                                <div className="text-gray-400 text-sm mb-2">Status</div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${initialized ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></div>
                                    <span className="text-white text-sm">
                                        {initialized ? 'CanvasManager Active' : 'Initializing...'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* What Works */}
                    <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
                        <div className="bg-green-700 px-6 py-3">
                            <h3 className="text-white font-semibold">✅ What Works</h3>
                        </div>
                        <div className="p-6">
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-400 mt-1">✓</span>
                                    <span className="text-gray-300">Element rendering</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-400 mt-1">✓</span>
                                    <span className="text-gray-300">Magnetic snapping</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-400 mt-1">✓</span>
                                    <span className="text-gray-300">Selection & dragging</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-400 mt-1">✓</span>
                                    <span className="text-gray-300">Performance monitoring</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-400 mt-1">✓</span>
                                    <span className="text-gray-300">Canvas → React sync</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* What's Missing */}
                    <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
                        <div className="bg-orange-700 px-6 py-3">
                            <h3 className="text-white font-semibold">⚠️ Not Yet Implemented</h3>
                        </div>
                        <div className="p-6">
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-start gap-2">
                                    <span className="text-orange-400 mt-1">○</span>
                                    <span className="text-gray-300">Collision detection</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-orange-400 mt-1">○</span>
                                    <span className="text-gray-300">ElementToolbar</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-orange-400 mt-1">○</span>
                                    <span className="text-gray-300">DimensionBadge</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-orange-400 mt-1">○</span>
                                    <span className="text-gray-300">Undo/redo</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-orange-400 mt-1">○</span>
                                    <span className="text-gray-300">React → Canvas sync</span>
                                </li>
                            </ul>
                            <p className="text-xs text-gray-500 mt-4">
                                Deferred to Week 2
                            </p>
                        </div>
                    </div>

                    {/* Console Logs */}
                    <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
                        <div className="bg-purple-700 px-6 py-3">
                            <h3 className="text-white font-semibold">🔍 Check Console</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-300 mb-3">
                                Open browser DevTools to see:
                            </p>
                            <ul className="space-y-1 text-xs text-gray-400">
                                <li>• <code className="text-purple-400">[CanvasManager]</code> logs</li>
                                <li>• <code className="text-blue-400">[SynchronizationBridge]</code> logs</li>
                                <li>• Performance metrics every 5s</li>
                                <li>• Element modification events</li>
                                <li>• Loop prevention messages</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* React State Debug (Bottom) */}
            <div className="max-w-7xl mx-auto mt-8">
                <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
                    <div className="bg-gray-700 px-6 py-3 flex justify-between items-center">
                        <h3 className="text-white font-semibold">React State (editorStore.elements)</h3>
                        <span className="text-xs text-gray-400">Updates via SynchronizationBridge</span>
                    </div>
                    <div className="p-6">
                        <pre className="text-xs text-gray-300 overflow-x-auto bg-gray-900 p-4 rounded">
                            {JSON.stringify(
                                elements.map(el => ({
                                    id: el.id,
                                    name: el.name,
                                    x: Math.round(el.x),
                                    y: Math.round(el.y),
                                    width: Math.round(el.width),
                                    height: Math.round(el.height),
                                })),
                                null,
                                2
                            )}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
}
