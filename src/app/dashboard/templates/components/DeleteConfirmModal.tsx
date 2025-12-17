'use client';

import React from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    itemCount?: number;
    isDeleting: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function DeleteConfirmModal({
    isOpen,
    title,
    message,
    itemCount = 1,
    isDeleting,
    onConfirm,
    onCancel,
}: DeleteConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/50" 
                onClick={onCancel}
            />
            
            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 px-6 py-4 bg-red-50 border-b border-red-100">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                        {itemCount > 1 && (
                            <p className="text-sm text-red-600">{itemCount} templates selected</p>
                        )}
                    </div>
                    <button
                        onClick={onCancel}
                        className="ml-auto p-1.5 text-gray-400 hover:text-gray-600 hover:bg-red-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Content */}
                <div className="p-6">
                    <p className="text-gray-600">{message}</p>
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800">
                            <strong>Warning:</strong> This action cannot be undone.
                        </p>
                    </div>
                </div>
                
                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onCancel}
                        disabled={isDeleting}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-4 h-4" />
                                Delete {itemCount > 1 ? `${itemCount} Templates` : 'Template'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
