'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Check, Tag as TagIcon, Folder, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TemplateListItem, updateTemplateMetadata, checkTemplateNameExists, getTemplate } from '@/lib/db/templates';
import { useCategoryStore } from '@/stores/categoryStore';
import { useTagStore } from '@/stores/tagStore';
import { toast } from 'sonner';

interface QuickEditModalProps {
    template: TemplateListItem | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export function QuickEditModal({ template, isOpen, onClose, onSave }: QuickEditModalProps) {
    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState<string | null>(null);
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [isFeatured, setIsFeatured] = useState(false);
    
    // UI state
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [nameError, setNameError] = useState<string | null>(null);
    
    // Stores
    const { categories, fetchCategories } = useCategoryStore();
    const { tags, fetchTags } = useTagStore();
    
    // Load categories and tags on mount
    useEffect(() => {
        fetchCategories(true);
        fetchTags(true);
    }, [fetchCategories, fetchTags]);
    
    // Load template data when modal opens
    useEffect(() => {
        if (template && isOpen) {
            setIsLoading(true);
            setNameError(null); // Reset error
            // Fetch full template data for description
            getTemplate(template.id)
                .then(fullTemplate => {
                    setName(template.name);
                    setDescription(fullTemplate?.description || '');
                    setCategoryId(template.category_id ?? null);
                    setIsFeatured(template.is_featured);
                    // Tags would need to be fetched separately if not in TemplateListItem
                    setSelectedTagIds(template.tags?.map(t => t.id) || []);
                })
                .catch((error) => {
                    console.error('Error loading template:', error);
                    // Still populate what we have
                    setName(template.name);
                    setCategoryId(template.category_id ?? null);
                    setIsFeatured(template.is_featured);
                    setSelectedTagIds(template.tags?.map(t => t.id) || []);
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else if (!isOpen) {
            // Reset state when modal closes
            setName('');
            setDescription('');
            setCategoryId(null);
            setSelectedTagIds([]);
            setIsFeatured(false);
            setNameError(null);
        }
    }, [template, isOpen]);
    
    // Validate name
    const validateName = async (): Promise<boolean> => {
        if (!name.trim()) {
            setNameError('Template name is required');
            return false;
        }
        
        // Check for duplicate name
        const result = await checkTemplateNameExists(name.trim(), template?.id);
        if (result.exists) {
            setNameError('A template with this name already exists');
            return false;
        }
        
        setNameError(null);
        return true;
    };
    
    // Toggle tag selection
    const toggleTag = (tagId: string) => {
        if (selectedTagIds.includes(tagId)) {
            setSelectedTagIds(selectedTagIds.filter(id => id !== tagId));
        } else {
            setSelectedTagIds([...selectedTagIds, tagId]);
        }
    };
    
    // Handle save
    const handleSave = async () => {
        if (!template) return;
        
        const isValid = await validateName();
        if (!isValid) return;
        
        setIsSaving(true);
        
        try {
            const success = await updateTemplateMetadata(template.id, {
                name: name.trim(),
                categoryId: categoryId,
                tagIds: selectedTagIds,
                isFeatured,
                description: description.trim(),
            });
            
            if (success) {
                toast.success('Template updated successfully');
                onSave();
                onClose();
            } else {
                toast.error('Failed to update template');
            }
        } catch (error) {
            console.error('Error updating template:', error);
            toast.error('An error occurred while saving');
        } finally {
            setIsSaving(false);
        }
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/50" 
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Quick Edit</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Content */}
                <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* Template Name */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Template Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        if (nameError) setNameError(null);
                                    }}
                                    onBlur={validateName}
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
                                    <p className="text-xs text-red-500">{nameError}</p>
                                )}
                            </div>
                            
                            {/* Description */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Description <span className="text-gray-400">(Optional)</span>
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    maxLength={500}
                                    rows={3}
                                    placeholder="Add a description..."
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-gray-400 text-right">
                                    {description.length}/500
                                </p>
                            </div>
                            
                            {/* Category */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                                    <Folder className="w-4 h-4" />
                                    Category
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setCategoryId(null)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                                            categoryId === null
                                                ? "bg-blue-600 text-white"
                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        )}
                                    >
                                        None
                                    </button>
                                    {categories.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setCategoryId(cat.id)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5",
                                                categoryId === cat.id
                                                    ? "bg-blue-600 text-white"
                                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                            )}
                                        >
                                            {cat.icon && <span>{cat.icon}</span>}
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Tags */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                                    <TagIcon className="w-4 h-4" />
                                    Tags
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {tags.length === 0 ? (
                                        <p className="text-sm text-gray-500">No tags available</p>
                                    ) : (
                                        tags.map(tag => (
                                            <button
                                                key={tag.id}
                                                onClick={() => toggleTag(tag.id)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5",
                                                    selectedTagIds.includes(tag.id)
                                                        ? "bg-blue-600 text-white"
                                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                )}
                                            >
                                                {selectedTagIds.includes(tag.id) && (
                                                    <Check className="w-3.5 h-3.5" />
                                                )}
                                                {tag.name}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                            
                            {/* Featured */}
                            <div className="pt-2 border-t border-gray-200">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={isFeatured}
                                        onChange={(e) => setIsFeatured(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700 group-hover:text-gray-900">
                                        <Star className="w-4 h-4 text-amber-500" />
                                        Featured Template
                                    </span>
                                </label>
                            </div>
                        </>
                    )}
                </div>
                
                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || isLoading}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors",
                            (isSaving || isLoading)
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:bg-blue-700"
                        )}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
