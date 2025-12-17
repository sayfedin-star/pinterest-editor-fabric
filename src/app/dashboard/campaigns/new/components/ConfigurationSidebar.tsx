'use client';

import React, { useState, useRef, useCallback } from 'react';
import { 
    Upload, 
    FileSpreadsheet, 
    RefreshCw, 
    AlertCircle, 
    Loader2, 
    FileText, 
    Table,
    Link2,
    Check,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCampaignWizard } from '@/lib/campaigns/CampaignWizardContext';
import { parseCSVFile } from '@/lib/utils/csvParser';
import { fetchCsvFromUrl, validateCsvUrl } from '@/lib/utils/csvUrlParser';

type UploadTab = 'file' | 'url';

interface ConfigurationSidebarProps {
    className?: string;
}

export function ConfigurationSidebar({ className }: ConfigurationSidebarProps) {
    const { 
        campaignName, 
        setCampaignName, 
        campaignDescription, 
        setCampaignDescription,
        csvData,
        setCSVData 
    } = useCampaignWizard();
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Local state
    const [nameError, setNameError] = useState(false);
    const [activeTab, setActiveTab] = useState<UploadTab>('file');
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // URL import state
    const [urlInput, setUrlInput] = useState('');
    const [urlValid, setUrlValid] = useState<boolean | null>(null);
    
    // Validation
    const validateName = useCallback(() => {
        if (!campaignName.trim()) {
            setNameError(true);
            return false;
        }
        setNameError(false);
        return true;
    }, [campaignName]);
    
    // Validate URL as user types
    const handleUrlChange = useCallback((value: string) => {
        setUrlInput(value);
        if (value.trim()) {
            const result = validateCsvUrl(value);
            setUrlValid(result.valid);
        } else {
            setUrlValid(null);
        }
    }, []);
    
    // Handle file upload
    const handleFile = useCallback(async (file: File) => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await parseCSVFile(file);

            if (result.success) {
                setCSVData({
                    headers: result.headers,
                    rows: result.data,
                    fileName: file.name,
                    rowCount: result.rowCount,
                });
            } else {
                setError(result.error || 'Failed to parse CSV');
                setCSVData(null);
            }
        } catch {
            setError('Failed to read file');
            setCSVData(null);
        } finally {
            setIsLoading(false);
        }
    }, [setCSVData]);
    
    // Handle URL import
    const handleUrlImport = useCallback(async () => {
        if (!urlInput.trim() || !urlValid) return;

        setIsLoading(true);
        setError(null);

        try {
            const result = await fetchCsvFromUrl(urlInput);

            if (result.success) {
                setCSVData({
                    headers: result.headers,
                    rows: result.data,
                    fileName: `Imported from URL`,
                    rowCount: result.rowCount,
                    sourceUrl: result.sourceUrl,
                });
                setUrlInput('');
                setUrlValid(null);
            } else {
                setError(result.error || 'Failed to import CSV from URL');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to import CSV');
        } finally {
            setIsLoading(false);
        }
    }, [urlInput, urlValid, setCSVData]);
    
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.csv')) {
            handleFile(file);
        } else {
            setError('Please upload a CSV file');
        }
    }, [handleFile]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
    }, [handleFile]);

    const handleReplace = useCallback(() => {
        setCSVData(null);
        setError(null);
        setUrlInput('');
        setUrlValid(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [setCSVData]);

    return (
        <aside className={cn(
            "bg-white border border-gray-200 rounded-xl p-5 space-y-6",
            "lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto",
            className
        )}>
            {/* Configuration Header */}
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="font-semibold text-gray-900">Configuration</h2>
            </div>
            
            {/* Campaign Name */}
            <div className="space-y-2">
                <label 
                    htmlFor="campaign-name" 
                    className="block text-sm font-medium text-gray-700"
                >
                    Campaign Name <span className="text-red-500">*</span>
                </label>
                <input
                    id="campaign-name"
                    type="text"
                    value={campaignName}
                    onChange={(e) => {
                        setCampaignName(e.target.value);
                        if (nameError && e.target.value.trim()) setNameError(false);
                    }}
                    onBlur={validateName}
                    placeholder="Summer Collection Launch"
                    maxLength={100}
                    className={cn(
                        "w-full px-3 py-2.5 border rounded-lg text-sm transition-colors",
                        "focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                        nameError 
                            ? "border-red-400 bg-red-50" 
                            : "border-gray-300 hover:border-gray-400"
                    )}
                />
                {nameError && (
                    <p className="text-xs text-red-500">Campaign name is required</p>
                )}
            </div>
            
            {/* Description */}
            <div className="space-y-2">
                <label 
                    htmlFor="campaign-description" 
                    className="block text-sm font-medium text-gray-700"
                >
                    Description <span className="text-gray-400">(Optional)</span>
                </label>
                <textarea
                    id="campaign-description"
                    value={campaignDescription}
                    onChange={(e) => setCampaignDescription(e.target.value)}
                    placeholder="Add campaign details..."
                    maxLength={500}
                    rows={3}
                    className={cn(
                        "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm resize-none",
                        "focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                        "hover:border-gray-400 transition-colors"
                    )}
                />
                <p className="text-xs text-gray-400 text-right">
                    {campaignDescription.length}/500
                </p>
            </div>
            
            {/* Data Source */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Data Source
                    </h3>
                    {csvData && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            Active
                        </span>
                    )}
                </div>
                
                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                />
                
                {/* Tab Switcher - Only show when no CSV loaded */}
                {!csvData && (
                    <div className="flex border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('file')}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors",
                                activeTab === 'file'
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <Upload className="w-3.5 h-3.5" />
                            Upload File
                        </button>
                        <button
                            onClick={() => setActiveTab('url')}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors",
                                activeTab === 'url'
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <Link2 className="w-3.5 h-3.5" />
                            Import URL
                        </button>
                    </div>
                )}
                
                {/* File Upload Tab */}
                {!csvData && activeTab === 'file' && (
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => !isLoading && fileInputRef.current?.click()}
                        className={cn(
                            "border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer",
                            isLoading
                                ? "border-blue-300 bg-blue-50 cursor-wait"
                                : isDragging
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                        )}
                    >
                        {isLoading ? (
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                <p className="text-sm text-blue-600">Processing...</p>
                            </div>
                        ) : (
                            <>
                                <Upload className={cn(
                                    "w-8 h-8 mx-auto mb-2",
                                    isDragging ? "text-blue-500" : "text-gray-400"
                                )} />
                                <p className="text-sm font-medium text-gray-700">
                                    Upload CSV File
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    .csv format • Max 5MB
                                </p>
                            </>
                        )}
                    </div>
                )}
                
                {/* URL Import Tab */}
                {!csvData && activeTab === 'url' && (
                    <div className="space-y-3">
                        {/* URL Input */}
                        <div className="relative">
                            <input
                                type="url"
                                value={urlInput}
                                onChange={(e) => handleUrlChange(e.target.value)}
                                placeholder="https://docs.google.com/..."
                                className={cn(
                                    "w-full px-3 py-2.5 pr-9 border rounded-lg text-sm",
                                    "focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                                    urlValid === true 
                                        ? "border-green-400" 
                                        : urlValid === false 
                                            ? "border-red-400" 
                                            : "border-gray-300"
                                )}
                                disabled={isLoading}
                            />
                            {urlValid !== null && (
                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                                    {urlValid ? (
                                        <Check className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <X className="w-4 h-4 text-red-500" />
                                    )}
                                </div>
                            )}
                        </div>
                        
                        {/* Import Button */}
                        <button
                            onClick={handleUrlImport}
                            disabled={!urlInput.trim() || !urlValid || isLoading}
                            className={cn(
                                "w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors",
                                (!urlInput.trim() || !urlValid || isLoading)
                                    ? "opacity-50 cursor-not-allowed"
                                    : "hover:bg-blue-700"
                            )}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    <Link2 className="w-4 h-4" />
                                    Import from URL
                                </>
                            )}
                        </button>
                        
                        {/* Supported Sources */}
                        <div className="bg-blue-50 rounded-lg p-3">
                            <p className="text-xs font-medium text-blue-800 mb-1">Supported:</p>
                            <ul className="text-xs text-blue-700 space-y-0.5">
                                <li>• Google Sheets (CSV export)</li>
                                <li>• Dropbox public links</li>
                                <li>• Direct CSV URLs</li>
                            </ul>
                        </div>
                    </div>
                )}
                
                {/* CSV Loaded State */}
                {csvData && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center shrink-0">
                                <FileSpreadsheet className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                    {csvData.fileName}
                                </p>
                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                                    <span className="flex items-center gap-1">
                                        <Table className="w-3 h-3" />
                                        {csvData.rowCount} rows
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <FileText className="w-3 h-3" />
                                        {csvData.headers.length} columns
                                    </span>
                                </div>
                                {csvData.sourceUrl && (
                                    <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                                        <Link2 className="w-3 h-3" />
                                        From URL
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={handleReplace}
                            className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100 rounded-lg transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Replace Data Source
                        </button>
                    </div>
                )}
                
                {/* Error */}
                {error && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}
            </div>
        </aside>
    );
}
