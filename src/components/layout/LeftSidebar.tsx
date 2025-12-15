'use client';

import React, { useState } from 'react';
import {
    MousePointer2,
    FileText,
    Table2,
    StickyNote,
    Type,
    Shapes,
    Pen,
    Frame,
    Smile,
    MessageCircle,
    Plus,
    Upload,
    FilePlus
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TemplateGallery } from '@/components/gallery/TemplateGallery';
import { CanvaImportModal } from '@/components/import/CanvaImportModal';

type ToolType = 'pointer' | 'templates' | 'table' | 'page' | 'text' | 'elements' | 'draw' | 'frame' | 'emoji' | 'comments' | 'more';

interface ToolButtonProps {
    icon: React.ElementType;
    label: string;
    shortcut?: string;
    isActive?: boolean;
    isHighlighted?: boolean;
    onClick: () => void;
}

/**
 * Individual tool button with tooltip
 */
function ToolButton({ icon: Icon, label, shortcut, isActive, isHighlighted, onClick }: ToolButtonProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={onClick}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className={cn(
                    "w-11 h-11 flex items-center justify-center rounded-lg transition-all duration-150",
                    isActive && "bg-gray-800 text-white",
                    isHighlighted && !isActive && "bg-blue-100 text-blue-600",
                    !isActive && !isHighlighted && "text-gray-600 hover:bg-gray-100"
                )}
            >
                <Icon className="w-5 h-5" strokeWidth={1.5} />
            </button>

            {/* Tooltip */}
            {showTooltip && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
                    <div className="bg-gray-800 text-white text-sm px-2.5 py-1.5 rounded-md whitespace-nowrap flex items-center gap-2">
                        <span>{label}</span>
                        {shortcut && (
                            <span className="text-gray-400 text-xs bg-gray-700 px-1.5 py-0.5 rounded">
                                {shortcut}
                            </span>
                        )}
                    </div>
                    {/* Arrow */}
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-800 rotate-45" />
                </div>
            )}
        </div>
    );
}

/**
 * Left Sidebar - Canva-style vertical toolbar
 */
export function LeftSidebar() {
    const [activeTool, setActiveTool] = useState<ToolType>('pointer');
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
                toast.success('Text element added');
                break;
            case 'elements':
                addShape('rect');
                toast.success('Shape element added');
                break;
            case 'templates':
                setIsGalleryOpen(true);
                break;
            case 'more':
                toast.info('More tools coming soon!');
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
                className="w-40 bg-gray-50 border-r border-gray-200 flex flex-col h-full"
                aria-label="Editor tools"
            >
                {/* Tools Section - Scrollable */}
                <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
                    <ToolButton
                        icon={MousePointer2}
                        label="Selection"
                        shortcut="V"
                        isHighlighted={activeTool === 'pointer'}
                        onClick={() => handleToolClick('pointer')}
                    />
                    <ToolButton
                        icon={FileText}
                        label="Templates"
                        onClick={() => handleToolClick('templates')}
                    />
                    <ToolButton
                        icon={Table2}
                        label="Table"
                        onClick={() => handleToolClick('table')}
                    />
                    <ToolButton
                        icon={StickyNote}
                        label="Page"
                        onClick={() => handleToolClick('page')}
                    />
                    <ToolButton
                        icon={Type}
                        label="Text"
                        shortcut="T"
                        isActive={activeTool === 'text'}
                        onClick={() => handleToolClick('text')}
                    />
                    <ToolButton
                        icon={Shapes}
                        label="Elements"
                        shortcut="E"
                        isActive={activeTool === 'elements'}
                        onClick={() => handleToolClick('elements')}
                    />
                    <ToolButton
                        icon={Pen}
                        label="Draw"
                        onClick={() => handleToolClick('draw')}
                    />
                    <ToolButton
                        icon={Frame}
                        label="Frame"
                        onClick={() => handleToolClick('frame')}
                    />
                    <ToolButton
                        icon={Smile}
                        label="Emoji"
                        onClick={() => handleToolClick('emoji')}
                    />
                    <ToolButton
                        icon={MessageCircle}
                        label="Comments"
                        onClick={() => handleToolClick('comments')}
                    />
                    <ToolButton
                        icon={Plus}
                        label="More"
                        onClick={() => handleToolClick('more')}
                    />
                </div>

                {/* Spacer */}
                <div className="flex-grow" />

                {/* Templates Section - Fixed at Bottom */}
                <div className="p-3 border-t border-gray-200 bg-white">
                    {/* MY TEMPLATES Label */}
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        My Templates
                    </p>

                    {/* Import Canva Button */}
                    <button
                        onClick={handleImportCanva}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-white text-sm font-medium mb-2 transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] shadow-md"
                        style={{
                            background: 'linear-gradient(135deg, #9333EA 0%, #7C3AED 100%)'
                        }}
                    >
                        <Upload className="w-4 h-4" />
                        <span>Import Canva</span>
                    </button>

                    {/* New Template Button */}
                    <button
                        onClick={handleNewTemplate}
                        className="relative w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] transition-all shadow-md"
                    >
                        {/* Notification Badge */}
                        <div className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-sm">
                            N
                        </div>
                        <FilePlus className="w-4 h-4" />
                        <span>New Template</span>
                    </button>
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
