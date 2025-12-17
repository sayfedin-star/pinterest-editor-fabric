/**
 * Tag Input Component
 * 
 * Autocomplete input for adding tags to templates.
 * Features debounced search, create-on-type, and chip display.
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Tag, X, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTagStore } from '@/stores/tagStore';
import { DbTag } from '@/types/database.types';

// ============================================
// Component Props
// ============================================

interface TagInputProps {
    /** Currently selected tag IDs */
    selectedIds: string[];
    /** Called when tags change */
    onChange: (tagIds: string[]) => void;
    /** Placeholder text */
    placeholder?: string;
    /** Max tags allowed (null = unlimited) */
    maxTags?: number | null;
    /** Allow creating new tags inline */
    allowCreate?: boolean;
    /** Optional className */
    className?: string;
    /** Disabled state */
    disabled?: boolean;
}

// ============================================
// Tag Input Component
// ============================================

export function TagInput({
    selectedIds,
    onChange,
    placeholder = 'Add tags...',
    maxTags = null,
    allowCreate = true,
    className,
    disabled = false,
}: TagInputProps) {
    const {
        tags,
        searchResults,
        isSearching,
        searchQuery,
        search,
        clearSearch,
        addTag,
        fetchTags,
        hasFetched,
    } = useTagStore();

    const [inputValue, setInputValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Fetch tags on mount if not already fetched
    useEffect(() => {
        if (!hasFetched) {
            fetchTags();
        }
    }, [hasFetched, fetchTags]);

    // Get selected tags data
    const selectedTags = selectedIds
        .map(id => tags.find(t => t.id === id))
        .filter((t): t is DbTag => t !== undefined);

    // Filter suggestions - exclude already selected
    const suggestions = (searchQuery ? searchResults : tags.slice(0, 10))
        .filter(t => !selectedIds.includes(t.id));

    // Check if exact match exists
    const exactMatchExists = tags.some(
        t => t.name.toLowerCase() === inputValue.trim().toLowerCase()
    );

    // Show dropdown when focused and has input or suggestions
    const showDropdown = isFocused && (inputValue || suggestions.length > 0);

    // Handle input change
    const handleInputChange = (value: string) => {
        setInputValue(value);
        if (value.trim()) {
            search(value.trim());
        } else {
            clearSearch();
        }
    };

    // Handle tag selection
    const handleSelectTag = (tag: DbTag) => {
        if (maxTags && selectedIds.length >= maxTags) {
            return;
        }

        if (!selectedIds.includes(tag.id)) {
            onChange([...selectedIds, tag.id]);
        }

        setInputValue('');
        clearSearch();
        inputRef.current?.focus();
    };

    // Handle tag removal
    const handleRemoveTag = (tagId: string) => {
        onChange(selectedIds.filter(id => id !== tagId));
    };

    // Handle create new tag
    const handleCreateTag = async () => {
        if (!inputValue.trim() || isCreating || exactMatchExists) return;

        setIsCreating(true);
        try {
            const newTag = await addTag({ name: inputValue.trim() });
            if (newTag) {
                handleSelectTag(newTag);
            }
        } finally {
            setIsCreating(false);
        }
    };

    // Handle key press
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (suggestions.length > 0) {
                handleSelectTag(suggestions[0]);
            } else if (allowCreate && inputValue.trim() && !exactMatchExists) {
                handleCreateTag();
            }
        } else if (e.key === 'Backspace' && !inputValue && selectedIds.length > 0) {
            // Remove last tag on backspace when input is empty
            handleRemoveTag(selectedIds[selectedIds.length - 1]);
        } else if (e.key === 'Escape') {
            setIsFocused(false);
            inputRef.current?.blur();
        }
    };

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsFocused(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const canAddMore = maxTags === null || selectedIds.length < maxTags;

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            {/* Input Container */}
            <div
                className={cn(
                    "flex flex-wrap items-center gap-2 px-3 py-2 border rounded-lg transition-all",
                    isFocused ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-300",
                    disabled && "bg-gray-50 cursor-not-allowed opacity-60"
                )}
                onClick={() => !disabled && inputRef.current?.focus()}
            >
                {/* Selected Tags */}
                {selectedTags.map((tag) => (
                    <span
                        key={tag.id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-sm"
                    >
                        <Tag className="w-3 h-3" />
                        {tag.name}
                        {!disabled && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveTag(tag.id);
                                }}
                                className="p-0.5 hover:bg-blue-200 rounded"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </span>
                ))}

                {/* Input */}
                {canAddMore && (
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onKeyDown={handleKeyDown}
                        placeholder={selectedTags.length > 0 ? '' : placeholder}
                        disabled={disabled}
                        className={cn(
                            "flex-1 min-w-[120px] outline-none text-sm bg-transparent",
                            disabled && "cursor-not-allowed"
                        )}
                    />
                )}

                {/* Loading indicator */}
                {isSearching && (
                    <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                )}
            </div>

            {/* Dropdown */}
            {showDropdown && !disabled && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {/* Suggestions */}
                    {suggestions.length > 0 && (
                        <div className="py-1">
                            {suggestions.map((tag) => (
                                <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => handleSelectTag(tag)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                                >
                                    <Tag className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-900">{tag.name}</span>
                                    {tag.template_count !== undefined && (
                                        <span className="text-xs text-gray-400 ml-auto">
                                            {tag.template_count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Create option */}
                    {allowCreate && inputValue.trim() && !exactMatchExists && (
                        <>
                            {suggestions.length > 0 && <hr className="border-gray-100" />}
                            <button
                                type="button"
                                onClick={handleCreateTag}
                                disabled={isCreating}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-blue-50 transition-colors"
                            >
                                {isCreating ? (
                                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                ) : (
                                    <Plus className="w-4 h-4 text-blue-500" />
                                )}
                                <span className="text-sm text-blue-600">
                                    Create "{inputValue.trim()}"
                                </span>
                            </button>
                        </>
                    )}

                    {/* No results */}
                    {suggestions.length === 0 && !inputValue && (
                        <div className="px-3 py-4 text-center text-sm text-gray-500">
                            No tags found. Start typing to search or create.
                        </div>
                    )}
                </div>
            )}

            {/* Max tags hint */}
            {maxTags && (
                <p className="mt-1 text-xs text-gray-500">
                    {selectedIds.length} / {maxTags} tags
                </p>
            )}
        </div>
    );
}

export default TagInput;
