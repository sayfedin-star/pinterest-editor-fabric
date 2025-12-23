'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { TemplateListItem } from '@/lib/db/templates';
import { DistributionMode } from '@/types/database.types';

// ============================================
// Types
// ============================================
export type WizardStep = 1 | 2 | 3 | 4;

export interface CSVData {
    headers: string[];
    rows: Record<string, string>[];
    fileName: string;
    rowCount: number;
    sourceUrl?: string;  // URL for CSV imported from URL
}

export interface FieldMapping {
    [templateField: string]: string; // templateField -> csvColumn
}

export type PreviewStatus = 'idle' | 'generating' | 'ready' | 'error';

// Selection mode for template picker
export type SelectionMode = 'single' | 'multiple';

// Maximum templates allowed in multi-template mode
export const MAX_TEMPLATES = 10;

export interface CampaignWizardState {
    currentStep: WizardStep;
    csvData: CSVData | null;
    selectedTemplate: TemplateListItem | null; // Keep for single mode / backward compat
    selectedTemplates: TemplateListItem[]; // NEW: Multi-template array
    selectionMode: SelectionMode; // NEW: 'single' or 'multiple'
    distributionMode: DistributionMode; // NEW: How templates are assigned to rows
    fieldMapping: FieldMapping;
    campaignName: string;
    campaignDescription: string;
    previewStatus: PreviewStatus;
}

export interface CampaignWizardActions {
    // Step navigation (kept for backward compatibility)
    setStep: (step: WizardStep) => void;
    nextStep: () => void;
    prevStep: () => void;
    
    // Data setters
    setCSVData: (data: CSVData | null) => void;
    setSelectedTemplate: (template: TemplateListItem | null) => void;
    setFieldMapping: (mapping: FieldMapping) => void;
    updateFieldMapping: (field: string, column: string) => void;
    setCampaignName: (name: string) => void;
    setCampaignDescription: (description: string) => void;
    setPreviewStatus: (status: PreviewStatus) => void;
    resetWizard: () => void;
    
    // Multi-template actions
    setSelectionMode: (mode: SelectionMode) => void;
    setSelectedTemplates: (templates: TemplateListItem[]) => void;
    addTemplate: (template: TemplateListItem) => boolean; // Returns false if at max
    removeTemplate: (templateId: string) => void;
    reorderTemplates: (fromIndex: number, toIndex: number) => void;
    setDistributionMode: (mode: DistributionMode) => void;
    
    // Computed properties
    getActiveTemplates: () => TemplateListItem[]; // Returns single or multi based on mode
    
    // Validation
    canProceed: () => boolean;
    getValidationErrors: () => string[];
    isFormValid: () => boolean;
}

type CampaignWizardContextType = CampaignWizardState & CampaignWizardActions;

// ============================================
// Initial State
// ============================================
const initialState: CampaignWizardState = {
    currentStep: 1,
    csvData: null,
    selectedTemplate: null,
    selectedTemplates: [],
    selectionMode: 'single',
    distributionMode: 'sequential',
    fieldMapping: {},
    campaignName: '',
    campaignDescription: '',
    previewStatus: 'idle',
};

// ============================================
// Context
// ============================================
const CampaignWizardContext = createContext<CampaignWizardContextType | undefined>(undefined);

// ============================================
// Provider
// ============================================
export function CampaignWizardProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<CampaignWizardState>(initialState);

    // Step navigation (kept for backward compatibility)
    const setStep = useCallback((step: WizardStep) => {
        setState((prev) => ({ ...prev, currentStep: step }));
    }, []);

    const nextStep = useCallback(() => {
        setState((prev) => {
            if (prev.currentStep < 4) {
                return { ...prev, currentStep: (prev.currentStep + 1) as WizardStep };
            }
            return prev;
        });
    }, []);

    const prevStep = useCallback(() => {
        setState((prev) => {
            if (prev.currentStep > 1) {
                return { ...prev, currentStep: (prev.currentStep - 1) as WizardStep };
            }
            return prev;
        });
    }, []);

    // Data setters
    const setCSVData = useCallback((data: CSVData | null) => {
        setState((prev) => ({ ...prev, csvData: data }));
    }, []);

    const setSelectedTemplate = useCallback((template: TemplateListItem | null) => {
        // Clear field mapping when template changes
        setState((prev) => ({ ...prev, selectedTemplate: template, fieldMapping: {} }));
    }, []);

    const setFieldMapping = useCallback((mapping: FieldMapping) => {
        setState((prev) => ({ ...prev, fieldMapping: mapping }));
    }, []);

    const updateFieldMapping = useCallback((field: string, column: string) => {
        setState((prev) => ({
            ...prev,
            fieldMapping: { ...prev.fieldMapping, [field]: column },
        }));
    }, []);

    const setCampaignName = useCallback((name: string) => {
        setState((prev) => ({ ...prev, campaignName: name }));
    }, []);

    const setCampaignDescription = useCallback((description: string) => {
        setState((prev) => ({ ...prev, campaignDescription: description }));
    }, []);

    const setPreviewStatus = useCallback((status: PreviewStatus) => {
        setState((prev) => ({ ...prev, previewStatus: status }));
    }, []);

    const resetWizard = useCallback(() => {
        setState(initialState);
    }, []);

    // ============================================
    // Multi-Template Actions
    // ============================================

    const setSelectionMode = useCallback((mode: SelectionMode) => {
        setState((prev) => {
            // When switching to single mode, keep only the first template
            if (mode === 'single' && prev.selectedTemplates.length > 0) {
                return {
                    ...prev,
                    selectionMode: mode,
                    selectedTemplate: prev.selectedTemplates[0],
                    fieldMapping: {}, // Clear mapping - will need to re-map
                };
            }
            // When switching to multiple mode, add current single template to array
            if (mode === 'multiple' && prev.selectedTemplate) {
                return {
                    ...prev,
                    selectionMode: mode,
                    selectedTemplates: [prev.selectedTemplate],
                };
            }
            return { ...prev, selectionMode: mode };
        });
    }, []);

    const setSelectedTemplates = useCallback((templates: TemplateListItem[]) => {
        setState((prev) => ({
            ...prev,
            selectedTemplates: templates.slice(0, MAX_TEMPLATES),
            fieldMapping: {}, // Clear mapping when templates change
        }));
    }, []);

    const addTemplate = useCallback((template: TemplateListItem): boolean => {
        let wasAdded = false;
        setState((prev) => {
            // Check if already at max or already selected
            if (prev.selectedTemplates.length >= MAX_TEMPLATES) {
                return prev;
            }
            if (prev.selectedTemplates.some(t => t.id === template.id)) {
                return prev; // Already selected
            }
            wasAdded = true;
            return {
                ...prev,
                selectedTemplates: [...prev.selectedTemplates, template],
                fieldMapping: {}, // Clear mapping when templates change
            };
        });
        return wasAdded;
    }, []);

    const removeTemplate = useCallback((templateId: string) => {
        setState((prev) => ({
            ...prev,
            selectedTemplates: prev.selectedTemplates.filter(t => t.id !== templateId),
            fieldMapping: {}, // Clear mapping when templates change
        }));
    }, []);

    const reorderTemplates = useCallback((fromIndex: number, toIndex: number) => {
        setState((prev) => {
            const templates = [...prev.selectedTemplates];
            const [removed] = templates.splice(fromIndex, 1);
            templates.splice(toIndex, 0, removed);
            return { ...prev, selectedTemplates: templates };
        });
    }, []);

    const setDistributionMode = useCallback((mode: DistributionMode) => {
        setState((prev) => ({ ...prev, distributionMode: mode }));
    }, []);

    const getActiveTemplates = useCallback((): TemplateListItem[] => {
        if (state.selectionMode === 'multiple') {
            return state.selectedTemplates;
        }
        return state.selectedTemplate ? [state.selectedTemplate] : [];
    }, [state.selectionMode, state.selectedTemplates, state.selectedTemplate]);

    // Step-based validation (kept for backward compatibility)
    const canProceed = useCallback(() => {
        switch (state.currentStep) {
            case 1:
                return state.csvData !== null && state.csvData.rowCount > 0;
            case 2:
                // In multi-mode, check selectedTemplates; in single-mode, check selectedTemplate
                if (state.selectionMode === 'multiple') {
                    return state.selectedTemplates.length >= 1;
                }
                return state.selectedTemplate !== null;
            case 3:
                return Object.keys(state.fieldMapping).length > 0;
            case 4:
                return state.campaignName.trim().length > 0;
            default:
                return false;
        }
    }, [state]);

    // Form-wide validation for single-page mode
    const getValidationErrors = useCallback((): string[] => {
        const errors: string[] = [];
        
        if (!state.campaignName.trim()) {
            errors.push('Campaign name is required');
        }
        
        if (!state.csvData) {
            errors.push('CSV file is required');
        }
        
        // Template validation based on mode
        if (state.selectionMode === 'multiple') {
            if (state.selectedTemplates.length === 0) {
                errors.push('Please select at least one template');
            } else if (state.selectedTemplates.length > MAX_TEMPLATES) {
                errors.push(`Maximum ${MAX_TEMPLATES} templates allowed`);
            }
        } else {
            if (!state.selectedTemplate) {
                errors.push('Please select a template');
            }
        }
        
        // Field mapping validation
        const hasTemplates = state.selectionMode === 'multiple' 
            ? state.selectedTemplates.length > 0 
            : state.selectedTemplate !== null;
        if (hasTemplates && Object.keys(state.fieldMapping).length === 0) {
            errors.push('Please map at least one field');
        }
        
        return errors;
    }, [state]);

    const isFormValid = useCallback((): boolean => {
        return getValidationErrors().length === 0;
    }, [getValidationErrors]);

    const value: CampaignWizardContextType = {
        ...state,
        setStep,
        nextStep,
        prevStep,
        setCSVData,
        setSelectedTemplate,
        setFieldMapping,
        updateFieldMapping,
        setCampaignName,
        setCampaignDescription,
        setPreviewStatus,
        resetWizard,
        // Multi-template actions
        setSelectionMode,
        setSelectedTemplates,
        addTemplate,
        removeTemplate,
        reorderTemplates,
        setDistributionMode,
        getActiveTemplates,
        // Validation
        canProceed,
        getValidationErrors,
        isFormValid,
    };

    return (
        <CampaignWizardContext.Provider value={value}>
            {children}
        </CampaignWizardContext.Provider>
    );
}

// ============================================
// Hook
// ============================================
export function useCampaignWizard() {
    const context = useContext(CampaignWizardContext);
    if (context === undefined) {
        throw new Error('useCampaignWizard must be used within a CampaignWizardProvider');
    }
    return context;
}

