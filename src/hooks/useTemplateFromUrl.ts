'use client';

/**
 * Hook to load template from URL parameter
 * 
 * Reads `?template=<id>` from URL and loads the template into the editor.
 * Used when navigating from templates page with "Edit" action.
 */

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEditorStore } from '@/stores/editorStore';
import { useTemplateStore } from '@/stores/templateStore';
import { useElementsStore } from '@/stores/elementsStore';
import { useCanvasStore } from '@/stores/canvasStore';
import { getTemplate } from '@/lib/db/templates';
import { toast } from 'sonner';

export function useTemplateFromUrl() {
    const searchParams = useSearchParams();
    const templateId = searchParams.get('template');
    const hasLoadedRef = useRef(false);
    
    // Store actions
    const loadTemplate = useEditorStore((s) => s.loadTemplate);
    const setTemplateId = useTemplateStore((s) => s.setTemplateId);
    const setTemplateName = useTemplateStore((s) => s.setTemplateName);
    const setIsNewTemplate = useTemplateStore((s) => s.setIsNewTemplate);
    const setElements = useElementsStore((s) => s.setElements);
    const setCanvasSize = useCanvasStore((s) => s.setCanvasSize);
    const setBackgroundColor = useCanvasStore((s) => s.setBackgroundColor);
    
    useEffect(() => {
        // Only run once per templateId
        if (!templateId || hasLoadedRef.current) return;
        
        const loadTemplateFromUrl = async () => {
            try {
                hasLoadedRef.current = true;
                
                const template = await getTemplate(templateId);
                
                if (!template) {
                    toast.error('Template not found');
                    return;
                }
                
                // Load template data into stores
                // Update templateStore
                setTemplateId(template.id);
                setTemplateName(template.name);
                setIsNewTemplate(false);
                
                // Update canvasStore
                if (template.canvas_size) {
                    setCanvasSize(template.canvas_size.width, template.canvas_size.height);
                }
                if (template.background_color) {
                    setBackgroundColor(template.background_color);
                }
                
                // Update elementsStore
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
    }, [templateId, loadTemplate, setTemplateId, setTemplateName, setIsNewTemplate, setElements, setCanvasSize, setBackgroundColor]);
    
    return { isLoadingFromUrl: !!templateId };
}
