'use client';

import React from 'react';
import { Trash2, Rocket, Folder, Tag, Star, X } from 'lucide-react';

interface BulkActionToolbarProps {
    selectedCount: number;
    onBulkDelete: () => void;
    onBulkGenerate: () => void;
    onBulkSetCategory: () => void;
    onBulkAddTags: () => void;
    onBulkToggleFeatured: () => void;
    onClearSelection: () => void;
}

export function BulkActionToolbar({
    selectedCount,
    onBulkDelete,
    onBulkGenerate,
    onBulkSetCategory,
    onBulkAddTags,
    onBulkToggleFeatured,
    onClearSelection,
}: BulkActionToolbarProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="sticky top-0 z-30 bg-blue-600 text-white px-4 py-3 rounded-xl shadow-lg mb-4 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between flex-wrap gap-3">
                {/* Selection Info */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={onClearSelection}
                        className="p-1.5 hover:bg-blue-500 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <span className="font-medium">
                        {selectedCount} template{selectedCount !== 1 ? 's' : ''} selected
                    </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Generate */}
                    <button
                        onClick={onBulkGenerate}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Rocket className="w-4 h-4" />
                        Generate
                    </button>

                    {/* Set Category */}
                    <button
                        onClick={onBulkSetCategory}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-400 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Folder className="w-4 h-4" />
                        Set Category
                    </button>

                    {/* Add Tags */}
                    <button
                        onClick={onBulkAddTags}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-400 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Tag className="w-4 h-4" />
                        Add Tags
                    </button>

                    {/* Toggle Featured */}
                    <button
                        onClick={onBulkToggleFeatured}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-400 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Star className="w-4 h-4" />
                        Featured
                    </button>

                    {/* Delete */}
                    <button
                        onClick={onBulkDelete}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
