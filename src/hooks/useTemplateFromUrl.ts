'use client';

/**
 * Hook to load template from URL parameter
 * 
 * Reads `?template=<id>` from URL and loads the template into the editor.
 * If no template parameter, resets to blank canvas state.
 * Used when navigating from templates page with "Edit" action.
 */

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEditorStore } from '@/stores/editorStore';
import { useTemplateStore } from '@/stores/templateStore';
import { getTemplate } from '@/lib/db/templates';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

export function useTemplateFromUrl() {
    const searchParams = useSearchParams();
    const templateId = searchParams.get('template');
    const hasProcessedRef = useRef<string | null>(null); // Track what we've processed
    
    // Store actions - all from consolidated editorStore
    const loadTemplate = useEditorStore((s) => s.loadTemplate);
    const setElements = useEditorStore((s) => s.setElements);
    const setCanvasSize = useEditorStore((s) => s.setCanvasSize);
    const setBackgroundColor = useEditorStore((s) => s.setBackgroundColor);
    
    // Template metadata from templateStore  
    const setTemplateId = useTemplateStore((s) => s.setTemplateId);
    const setTemplateName = useTemplateStore((s) => s.setTemplateName);
    const setIsNewTemplate = useTemplateStore((s) => s.setIsNewTemplate);
    
    useEffect(() => {
        // Skip if we've already processed this exact state
        const currentState = templateId || 'NEW';
        if (hasProcessedRef.current === currentState) return;
        hasProcessedRef.current = currentState;
        
        if (templateId) {
            // Load existing template
            const loadTemplateFromUrl = async () => {
                try {
                    const template = await getTemplate(templateId);
                    
                    if (!template) {
                        toast.error('Template not found');
                        return;
                    }
                    
                    // Load template data into stores
                    setTemplateId(template.id);
                    setTemplateName(template.name);
                    setIsNewTemplate(false);
                    
                    if (template.canvas_size) {
                        setCanvasSize(template.canvas_size.width, template.canvas_size.height);
                    }
                    if (template.background_color) {
                        setBackgroundColor(template.background_color);
                    }
                    
                    if (template.elements && Array.isArray(template.elements)) {
                        setElements(template.elements);
                    }
                    
                    // Also update editorStore (for backward compatibility)
                    loadTemplate({
                        id: template.id,
                        name: template.name,
                        elements: template.elements || [],
                        background_color: template.background_color || '#ffffff',
                        canvas_size: template.canvas_size,
                    });
                    
                    toast.success(`Loaded "${template.name}"`);
                } catch (error) {
                    console.error('Error loading template from URL:', error);
                    toast.error('Failed to load template');
                }
            };
            
            loadTemplateFromUrl();
        } else {
            // No template parameter - reset to blank canvas state
            console.log('[useTemplateFromUrl] No template parameter - resetting to blank canvas');
            
            const newTemplateId = uuidv4();
            
            // Reset templateStore
            setTemplateId(newTemplateId);
            setTemplateName('Untitled Template');
            setIsNewTemplate(true);
            
            // Reset canvasStore to defaults
            setCanvasSize(1000, 1500); // Default Pinterest pin size
            setBackgroundColor('#ffffff');
            
            // Clear elements
            setElements([]);
            
            // Reset editorStore
            loadTemplate({
                id: newTemplateId,
                name: 'Untitled Template',
                elements: [],
                background_color: '#ffffff',
                canvas_size: { width: 1000, height: 1500 },
            });
        }
    }, [templateId, loadTemplate, setTemplateId, setTemplateName, setIsNewTemplate, setElements, setCanvasSize, setBackgroundColor]);
    
    return { isLoadingFromUrl: !!templateId };
}

