'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Zap } from 'lucide-react';
import { Element } from '@/types/editor';
import { generateUniqueName } from '@/lib/utils/nameValidation';

interface DynamicFieldPopupProps {
    isOpen: boolean;
    onClose: () => void;
    currentFieldName: string | undefined;
    isDynamic: boolean;
    elementType: 'image' | 'text';
    elements: Element[];
    onSave: (fieldName: string, isDynamic: boolean) => void;
}

/**
 * Popup for configuring dynamic field settings on an element
 * Allows setting custom field names and toggling dynamic mode
 */
export function DynamicFieldPopup({
    isOpen,
    onClose,
    currentFieldName,
    isDynamic,
    elementType,
    elements,
    onSave,
}: DynamicFieldPopupProps) {
    // Use props directly for initial state, update via interaction only
    const [fieldName, setFieldName] = useState('');
    const [enabled, setEnabled] = useState(false);
    const [initialized, setInitialized] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Initialize state only once when popup opens (using ref to track)
    const shouldInitialize = isOpen && !initialized;
    if (shouldInitialize) {
        // This is synchronous and runs during render, avoiding useEffect setState
        setFieldName(currentFieldName || '');
        setEnabled(isDynamic);
        setInitialized(true);
    }
    
    // Reset initialized flag when popup closes
    if (!isOpen && initialized) {
        setInitialized(false);
    }
    
    // Focus input when popup opens
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => inputRef.current?.focus(), 100);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return undefined;
        
        const handleClickOutside = (e: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return undefined;
        
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSave = () => {
        // Generate unique field name if empty and enabled
        let finalFieldName = fieldName.trim();
        if (enabled && !finalFieldName) {
            // Use the utility to get a truly unique field name
            const unique = generateUniqueName(elements, elementType);
            finalFieldName = unique.fieldName;
        }
        onSave(finalFieldName, enabled);
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        }
    };

    const placeholder = elementType === 'image' ? 'image1, productImage...' : 'text1, title...';

    return (
        <div
            ref={popupRef}
            className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-1010 w-64"
            style={{ minWidth: '260px' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-gray-800 font-medium">
                    <Zap size={16} className="text-purple-500" />
                    Dynamic Field
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                >
                    <X size={14} />
                </button>
            </div>

            {/* Toggle */}
            <div className="flex items-center justify-between mb-3 py-2 border-b border-gray-100">
                <label htmlFor="dynamic-toggle" className="text-sm text-gray-600">
                    Make Dynamic
                </label>
                <button
                    id="dynamic-toggle"
                    onClick={() => setEnabled(!enabled)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                        enabled ? 'bg-purple-500' : 'bg-gray-300'
                    }`}
                >
                    <div
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                </button>
            </div>

            {/* Field Name Input */}
            <div className={enabled ? '' : 'opacity-50 pointer-events-none'}>
                <label htmlFor="field-name" className="text-xs text-gray-500 block mb-1">
                    Field Name
                </label>
                <input
                    ref={inputRef}
                    id="field-name"
                    type="text"
                    value={fieldName}
                    onChange={(e) => setFieldName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                    disabled={!enabled}
                />
                <p className="text-xs text-gray-400 mt-1">
                    Use this name in your CSV to map data
                </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-4">
                <button
                    onClick={onClose}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    className="px-3 py-1.5 text-sm bg-purple-500 text-white rounded-md hover:bg-purple-600"
                >
                    Save
                </button>
            </div>
        </div>
    );
}
