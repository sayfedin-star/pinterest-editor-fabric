'use client';

import React, { useState } from 'react';
import {
    Hand,
    Type,
    Square,
    Image,
    Upload,
    FilePlus,
    LayoutGrid
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TemplateGallery } from '@/components/gallery/TemplateGallery';
import { CanvaImportModal } from '@/components/import/CanvaImportModal';
import { RichTooltip } from '@/components/ui/RichTooltip';

type ToolType = 'pan' | 'text' | 'shape' | 'image' | 'templates';

interface ToolButtonProps {
    icon: React.ElementType;
    label: string;
    description?: string;
    shortcut?: string;
    isActive?: boolean;
    onClick: () => void;
}

/**
 * Individual tool button with rich tooltip
 */
function ToolButton({ icon: Icon, label, description, shortcut, isActive, onClick }: ToolButtonProps) {
    return (
        <RichTooltip
            label={label}
            description={description}
            shortcut={shortcut}
            side="right"
            sideOffset={12}
        >
            <button
                onClick={onClick}
                aria-label={shortcut ? `${label}, keyboard shortcut ${shortcut}` : label}
                aria-pressed={isActive}
                className={cn(
                    "group relative w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                    isActive
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                        : "text-gray-600 hover:bg-white hover:shadow-md hover:text-gray-900"
                )}
            >
                <Icon className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
            </button>
        </RichTooltip>
    );
}

/**
 * Left Sidebar - Clean vertical toolbar with accessible icons
 */
export function LeftSidebar() {
    const [activeTool, setActiveTool] = useState<ToolType>('pan');
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [isCanvaImportOpen, setIsCanvaImportOpen] = useState(false);

    // Editor actions
    const addText = useEditorStore((s) => s.addText);
    const addShape = useEditorStore((s) => s.addShape);
    const addImage = useEditorStore((s) => s.addImage);
    const resetToNewTemplate = useEditorStore((s) => s.resetToNewTemplate);

    // Tool handlers
    const handleToolClick = (tool: ToolType) => {
        setActiveTool(tool);

        switch (tool) {
            case 'text':
                addText();
                toast.success('Text added');
                break;
            case 'shape':
                addShape('rect');
                toast.success('Shape added');
                break;
            case 'image':
                addImage();
                toast.success('Image placeholder added');
                break;
            case 'templates':
                setIsGalleryOpen(true);
                break;
            default:
                break;
        }
    };

    const handleNewTemplate = () => {
        resetToNewTemplate();
        toast.success('New template created');
    };

    const handleImportCanva = () => {
        setIsCanvaImportOpen(true);
    };

    return (
        <>
            <aside
                className="w-[72px] bg-gray-50/80 backdrop-blur-sm border-r border-gray-200/60 flex flex-col h-full"
                aria-label="Editor tools"
            >
                {/* Tools Section */}
                <div className="flex-1 flex flex-col items-center py-4 gap-2">
                    <ToolButton
                        icon={Hand}
                        label="Pan"
                        description="Pan and navigate around the canvas"
                        shortcut="H"
                        isActive={activeTool === 'pan'}
                        onClick={() => handleToolClick('pan')}
                    />
                    <ToolButton
                        icon={Type}
                        label="Text"
                        description="Add a new text element"
                        shortcut="T"
                        isActive={activeTool === 'text'}
                        onClick={() => handleToolClick('text')}
                    />
                    <ToolButton
                        icon={Square}
                        label="Shape"
                        description="Add a rectangle shape"
                        shortcut="R"
                        isActive={activeTool === 'shape'}
                        onClick={() => handleToolClick('shape')}
                    />
                    <ToolButton
                        icon={Image}
                        label="Image"
                        description="Add an image placeholder"
                        shortcut="I"
                        isActive={activeTool === 'image'}
                        onClick={() => handleToolClick('image')}
                    />
                    <ToolButton
                        icon={LayoutGrid}
                        label="Templates"
                        description="Browse template gallery"
                        isActive={activeTool === 'templates'}
                        onClick={() => handleToolClick('templates')}
                    />
                </div>

                {/* Bottom Section - Templates */}
                <div className="p-3 space-y-2">
                    {/* Import Canva Button */}
                    <RichTooltip
                        label="Import from Canva"
                        description="Import SVG designs exported from Canva"
                        side="right"
                    >
                        <button
                            onClick={handleImportCanva}
                            aria-label="Import design from Canva"
                            className="w-full flex flex-col items-center justify-center gap-1 py-3 rounded-xl text-white text-xs font-semibold transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                            style={{
                                background: 'linear-gradient(145deg, #A855F7 0%, #7C3AED 100%)'
                            }}
                        >
                            <Upload className="w-5 h-5" aria-hidden="true" />
                            <span>Import</span>
                        </button>
                    </RichTooltip>

                    {/* New Template Button */}
                    <RichTooltip
                        label="New Template"
                        description="Create a blank template"
                        side="right"
                    >
                        <button
                            onClick={handleNewTemplate}
                            aria-label="Create new blank template"
                            className="relative w-full flex flex-col items-center justify-center gap-1 py-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-semibold hover:from-blue-600 hover:to-blue-700 hover:scale-105 hover:shadow-xl active:scale-95 transition-all duration-200 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        >
                            {/* Notification Badge */}
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-bold border-2 border-white shadow animate-pulse">
                                !
                            </div>
                            <FilePlus className="w-5 h-5" aria-hidden="true" />
                            <span>New</span>
                        </button>
                    </RichTooltip>
                </div>
            </aside>

            {/* Template Gallery Modal */}
            <TemplateGallery
                isOpen={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
            />

            {/* Canva Import Modal */}
            <CanvaImportModal
                isOpen={isCanvaImportOpen}
                onClose={() => setIsCanvaImportOpen(false)}
            />
        </>
    );
}
