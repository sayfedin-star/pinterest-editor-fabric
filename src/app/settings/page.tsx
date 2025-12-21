'use client';

/**
 * Settings Page
 * 
 * User preferences for the editor application.
 * Currently includes auto-save configuration.
 */

import { useSettingsStore } from '@/stores/settingsStore';
import Link from 'next/link';
import { ArrowLeft, Save, Clock } from 'lucide-react';

const INTERVAL_OPTIONS = [
    { value: 10, label: '10 seconds' },
    { value: 30, label: '30 seconds (recommended)' },
    { value: 60, label: '1 minute' },
    { value: 120, label: '2 minutes' },
    { value: 300, label: '5 minutes' },
];

export default function SettingsPage() {
    const autoSaveEnabled = useSettingsStore((s) => s.autoSaveEnabled);
    const autoSaveInterval = useSettingsStore((s) => s.autoSaveInterval);
    const setAutoSaveEnabled = useSettingsStore((s) => s.setAutoSaveEnabled);
    const setAutoSaveInterval = useSettingsStore((s) => s.setAutoSaveInterval);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="max-w-2xl mx-auto flex items-center gap-4">
                    <Link 
                        href="/editor" 
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Back to Editor</span>
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-2xl mx-auto px-6 py-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-8">Settings</h1>

                {/* Auto-Save Section */}
                <section className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Save className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Auto-Save</h2>
                            <p className="text-sm text-gray-500">
                                Automatically save your work at regular intervals
                            </p>
                        </div>
                    </div>

                    {/* Toggle */}
                    <div className="flex items-center justify-between py-4 border-b border-gray-100">
                        <div>
                            <label 
                                htmlFor="auto-save-toggle" 
                                className="font-medium text-gray-900 cursor-pointer"
                            >
                                Enable Auto-Save
                            </label>
                            <p className="text-sm text-gray-500 mt-0.5">
                                {autoSaveEnabled 
                                    ? 'Your work will be saved automatically' 
                                    : 'You\'ll need to save manually'}
                            </p>
                        </div>
                        <button
                            id="auto-save-toggle"
                            role="switch"
                            aria-checked={autoSaveEnabled}
                            onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                            className={`
                                relative inline-flex h-6 w-11 items-center rounded-full
                                transition-colors duration-200 ease-in-out
                                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                                ${autoSaveEnabled ? 'bg-blue-600' : 'bg-gray-200'}
                            `}
                        >
                            <span
                                className={`
                                    inline-block h-4 w-4 transform rounded-full bg-white shadow-sm
                                    transition-transform duration-200 ease-in-out
                                    ${autoSaveEnabled ? 'translate-x-6' : 'translate-x-1'}
                                `}
                            />
                        </button>
                    </div>

                    {/* Interval Selection */}
                    {autoSaveEnabled && (
                        <div className="py-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center gap-3 mb-3">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <label 
                                    htmlFor="interval-select"
                                    className="font-medium text-gray-900"
                                >
                                    Save Interval
                                </label>
                            </div>
                            <select
                                id="interval-select"
                                value={autoSaveInterval}
                                onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
                                className="
                                    w-full px-3 py-2 rounded-lg border border-gray-300
                                    bg-white text-gray-900
                                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                    transition-colors
                                "
                            >
                                {INTERVAL_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <p className="text-sm text-gray-500 mt-2">
                                Changes will trigger a save after {autoSaveInterval} seconds of inactivity
                            </p>
                        </div>
                    )}
                </section>

                {/* Info Box */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-sm text-blue-800">
                        <strong>Tip:</strong> Settings are saved automatically and will persist across browser sessions.
                    </p>
                </div>
            </main>
        </div>
    );
}
