import React from 'react';
import {
    Undo2,
    Redo2,
    Minus,
    Plus,
    Maximize,
    ChevronDown,
    Magnet
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { useSnappingSettingsStore } from '@/stores/snappingSettingsStore';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function FloatingToolbar() {
    const undo = useEditorStore((s) => s.undo);
    const redo = useEditorStore((s) => s.redo);
    const canUndo = useEditorStore((s) => s.canUndo());
    const canRedo = useEditorStore((s) => s.canRedo());
    
    // Zoom
    const zoom = useEditorStore((s) => s.zoom);
    const setZoom = useEditorStore((s) => s.setZoom);
    const canvasSize = useEditorStore((s) => s.canvasSize);

    // Snapping
    const magneticSnapping = useSnappingSettingsStore((s) => s.magneticSnapping);
    const setMagneticSnapping = useSnappingSettingsStore((s) => s.setMagneticSnapping);

    const handleZoomIn = () => setZoom(Math.min(zoom + 0.1, 3));
    const handleZoomOut = () => setZoom(Math.max(zoom - 0.1, 0.1));
    
    const handleFit = () => {
         // Simple fit logic, can be refined based on viewport
         setZoom(0.5); 
    };

    return (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 h-10 bg-white rounded-full shadow-lg border border-gray-200 flex items-center px-1.5 gap-1 z-50">
            {/* Undo / Redo */}
            <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200">
                <button
                    onClick={undo}
                    disabled={!canUndo}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-full disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>Undo</span>
                </button>
                <button
                    onClick={redo}
                    disabled={!canRedo}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-full disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                >
                    <Redo2 className="w-3.5 h-3.5" />
                    <span>Redo</span>
                </button>
            </div>

            {/* Snapping */}
            <div className="flex items-center px-1 border-r border-gray-200 h-6">
                 <button
                    onClick={() => setMagneticSnapping(!magneticSnapping)}
                    className={cn(
                        "w-7 h-7 flex items-center justify-center rounded-full transition-colors",
                         magneticSnapping ? "bg-pink-100 text-pink-600" : "text-gray-500 hover:bg-gray-100"
                    )}
                    title="Magnetic Snapping"
                 >
                    <Magnet className="w-4 h-4" />
                </button>
                 {/* Chevron for Snapping Menu can be added here if needed */}
                <button className="w-4 h-full flex items-center justify-center text-gray-400 hover:text-gray-600">
                    <ChevronDown className="w-3 h-3" />
                </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 pl-1">
                <button 
                    onClick={handleZoomOut}
                    className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-full"
                >
                    <Minus className="w-3.5 h-3.5" />
                </button>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <button className="w-16 h-7 flex items-center justify-center gap-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-md border border-gray-200">
                            {Math.round(zoom * 100)}%
                            <ChevronDown className="w-3 h-3 opacity-50" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map(val => (
                             <DropdownMenuItem key={val} onClick={() => setZoom(val)}>
                                {val * 100}%
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <button 
                    onClick={handleZoomIn}
                    className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-full"
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
            </div>

             {/* Fit */}
            <div className="flex items-center pl-2 border-l border-gray-200 ml-1">
                 <button 
                    onClick={handleFit} // Needs proper fit logic passed down or accessed via store if possible
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <Maximize className="w-3.5 h-3.5" />
                    <span>Fit</span>
                </button>
            </div>
        </div>
    );
}
