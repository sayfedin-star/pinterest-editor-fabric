'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Font, getFonts, loadCustomFont } from '@/lib/db/fonts';
import { supabase } from '@/lib/supabase';

// Default Google Fonts
const DEFAULT_FONTS = [
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 
    'Poppins', 'Nunito', 'Raleway', 'Ubuntu', 'Oswald',
    'Playfair Display', 'Merriweather', 'Lora', 'PT Serif',
    'Bebas Neue', 'Anton', 'Teko', 'Righteous', 
    'Pacifico', 'Dancing Script', 'Great Vibes', 'Satisfy',
    'Cookie', 'Lobster', 'Sacramento', 'Permanent Marker'
];

interface SelectedFont {
    family: string;
    url?: string;
    provider: 'system' | 'google' | 'custom';
}

interface FontPickerBoxProps {
    value: string;
    onChange: (font: SelectedFont) => void;
}

/**
 * FontPickerBox - Switchboard.ai-style font picker
 * Shows a preview box with selected font and "choose font" link
 * Opens modal with font grid on click
 */
export function FontPickerBox({ value, onChange }: FontPickerBoxProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="space-y-2">
            {/* Preview Box */}
            <div 
                className="w-32 h-28 border-2 border-gray-200 rounded-lg flex flex-col items-center justify-center bg-white cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => setIsModalOpen(true)}
            >
                <span 
                    className="text-4xl leading-none mb-2"
                    style={{ fontFamily: value || 'Arial' }}
                >
                    Aa
                </span>
                <span className="text-xs text-gray-500 truncate max-w-[110px] px-2 text-center">
                    {value || 'No font selected'}
                </span>
            </div>

            {/* Choose Font Link */}
            <button 
                onClick={() => setIsModalOpen(true)}
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
                choose font
            </button>

            {/* Font Selection Modal */}
            <FontSelectionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                currentFont={value}
                onSelectFont={(font) => {
                    onChange(font);
                    setIsModalOpen(false);
                }}
            />
        </div>
    );
}

/**
 * FontSelectionModal - Switchboard.ai-style modal with large font cards
 */
function FontSelectionModal({
    isOpen,
    onClose,
    currentFont,
    onSelectFont,
}: {
    isOpen: boolean;
    onClose: () => void;
    currentFont: string;
    onSelectFont: (font: SelectedFont) => void;
}) {
    const [selectedFont, setSelectedFont] = useState<SelectedFont | null>(null);
    const [customFonts, setCustomFonts] = useState<Font[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Load custom fonts using the same function as dashboard
    const loadFonts = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getFonts();
            setCustomFonts(data);

            // Load fonts into browser for preview
            for (const font of data) {
                try {
                    await loadCustomFont(font);
                } catch {
                    console.warn('Failed to load font:', font.family);
                }
            }
        } catch (err) {
            console.error('Error loading fonts:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            loadFonts();
            setSelectedFont(null);
        }
    }, [isOpen, loadFonts]);

    // Handle font upload
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!ext || !['ttf', 'otf', 'woff', 'woff2'].includes(ext)) {
            alert('Please upload a TTF, OTF, WOFF, or WOFF2 file');
            return;
        }

        setUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const familyName = file.name
                .replace(/\.(ttf|otf|woff|woff2)$/i, '')
                .replace(/[-_]/g, ' ');

            const fileName = `${Date.now()}_${file.name}`;
            const storagePath = `fonts/${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('assets')
                .upload(storagePath, file);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('assets')
                .getPublicUrl(storagePath);

            await supabase.from('custom_fonts').insert({
                user_id: user.id,
                family: familyName,
                file_url: urlData.publicUrl,
                format: ext,
            });

            await loadFonts();
        } catch (err) {
            console.error('Upload error:', err);
            alert('Failed to upload font');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    // Get display name for font (with extension for custom fonts)
    const getDisplayName = (font: Font) => {
        // Reconstruct filename-like display
        const cleanName = font.family.replace(/\s+/g, '-');
        return `${cleanName}.${font.format}`;
    };

    if (!isOpen) return null;

    // All fonts combined for display
    const allFonts = [
        ...customFonts.map(f => ({ 
            type: 'custom' as const, 
            family: f.family, 
            displayName: getDisplayName(f),
            url: f.file_url 
        })),
        ...DEFAULT_FONTS.map(f => ({ 
            type: 'google' as const, 
            family: f, 
            displayName: f,
            url: undefined 
        }))
    ];

    const totalFonts = allFonts.length;

    // Use portal to render at document.body level for true centering
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
            {/* Window-style popup */}
            <div className="bg-white rounded-lg shadow-2xl w-[1000px] max-h-[80vh] flex flex-col overflow-hidden border border-gray-300">
                {/* macOS-style title bar */}
                <div className="flex items-center h-8 bg-gradient-to-b from-gray-200 to-gray-300 border-b border-gray-400 px-3 select-none">
                    {/* Traffic light buttons */}
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={onClose}
                            className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 border border-red-600"
                            title="Close"
                        />
                        <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500 border border-green-600" />
                    </div>
                    {/* Window title */}
                    <div className="flex-1 text-center">
                        <span className="text-xs font-medium text-gray-600">Select Font</span>
                    </div>
                    {/* Spacer for symmetry */}
                    <div className="w-12" />
                </div>

                {/* Toolbar */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                    <span className="text-sm text-gray-500">
                        {selectedFont ? '1 file selected' : 'Select a font'}
                    </span>
                    <div className="flex items-center gap-2">
                        <label className={cn(
                            "flex items-center gap-2 px-4 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 cursor-pointer font-medium",
                            uploading && "opacity-50 cursor-not-allowed"
                        )}>
                            <Upload className="w-4 h-4" />
                            {uploading ? 'Uploading...' : 'Upload'}
                            <input
                                type="file"
                                accept=".ttf,.otf,.woff,.woff2"
                                onChange={handleUpload}
                                className="hidden"
                                disabled={uploading}
                            />
                        </label>
                        <button
                            onClick={() => selectedFont && onSelectFont(selectedFont)}
                            disabled={!selectedFont}
                            className={cn(
                                "flex items-center gap-1 px-4 py-1.5 text-sm rounded font-medium",
                                selectedFont
                                    ? "bg-blue-500 text-white hover:bg-blue-600"
                                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                            )}
                        >
                            <Check className="w-4 h-4" />
                            OK
                        </button>
                        <button
                            onClick={onClose}
                            className="flex items-center gap-1 px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100 font-medium"
                        >
                            <X className="w-4 h-4" />
                            Cancel
                        </button>
                    </div>
                </div>

                {/* Font Grid */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                            <p className="text-sm text-gray-500">Loading fonts...</p>
                        </div>
                    ) : (
                        <>
                            {/* Section Header */}
                            <div className="mb-4">
                                <span className="text-sm text-gray-600">
                                    Fonts ({totalFonts})
                                </span>
                            </div>

                            {/* Font Grid - Switchboard.ai style */}
                            <div className="grid grid-cols-4 gap-4">
                                {allFonts.map((font) => (
                                    <SwitchboardFontCard
                                        key={font.family}
                                        family={font.family}
                                        displayName={font.displayName}
                                        isSelected={selectedFont?.family === font.family}
                                        onClick={() => setSelectedFont({
                                            family: font.family,
                                            url: font.url,
                                            provider: font.type === 'custom' ? 'custom' : 'google'
                                        })}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

/**
 * SwitchboardFontCard - Large font card with checkered background
 * Matches Switchboard.ai style
 */
function SwitchboardFontCard({
    family,
    displayName,
    isSelected,
    onClick,
}: {
    family: string;
    displayName: string;
    isSelected: boolean;
    onClick: () => void;
}) {
    // Checkered background pattern for transparency effect
    const checkeredBg = {
        backgroundImage: `
            linear-gradient(45deg, #e0e0e0 25%, transparent 25%),
            linear-gradient(-45deg, #e0e0e0 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #e0e0e0 75%),
            linear-gradient(-45deg, transparent 75%, #e0e0e0 75%)
        `,
        backgroundSize: '16px 16px',
        backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px'
    };

    return (
        <button
            onClick={onClick}
            className={cn(
                "relative bg-white rounded-lg overflow-hidden transition-all",
                isSelected
                    ? "ring-2 ring-blue-500"
                    : "border border-gray-200 hover:border-gray-300"
            )}
        >
            {/* Font Preview with checkered background */}
            <div 
                className="h-32 flex items-center justify-center"
                style={checkeredBg}
            >
                <span 
                    style={{ fontFamily: family }}
                    className="text-6xl font-normal text-gray-900"
                >
                    Aa
                </span>
            </div>

            {/* Font Name */}
            <div className="px-3 py-2 text-center border-t border-gray-100">
                <span className="text-xs text-gray-500 truncate block">
                    {displayName}
                </span>
            </div>

            {/* Selection indicator */}
            {isSelected && (
                <div className="absolute top-2 left-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                </div>
            )}
        </button>
    );
}
