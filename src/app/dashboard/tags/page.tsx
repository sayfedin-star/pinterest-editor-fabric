/**
 * Tags Management Page (WordPress-style)
 * 
 * Two-column layout:
 * - Left: Sticky form for adding/editing tags + Popular tags widget
 * - Right: Data table with search, sort, and bulk actions
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Tag, HelpCircle } from 'lucide-react';
import { DbTag } from '@/types/database.types';
import { AddTagForm } from '@/components/tags/AddTagForm';
import { TagsTable } from '@/components/tags/TagsTable';
import { PopularTags } from '@/components/tags/PopularTags';
import { useTagStore } from '@/stores/tagStore';

export default function TagsPage() {
    const [editingTag, setEditingTag] = useState<DbTag | null>(null);
    const { fetchTags, hasFetched } = useTagStore();

    // Ensure tags are fetched with counts for popular tags
    useEffect(() => {
        if (!hasFetched) {
            fetchTags(true);
        }
    }, [hasFetched, fetchTags]);

    const handleEdit = (tag: DbTag) => {
        setEditingTag(tag);
        // Scroll to top on mobile
        if (window.innerWidth < 1024) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleCancelEdit = () => {
        setEditingTag(null);
    };

    const handleSaved = () => {
        setEditingTag(null);
    };

    const handlePopularTagClick = (tag: DbTag) => {
        // When a popular tag is clicked, scroll to it in the table and select it for editing
        setEditingTag(tag);
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                            <Tag className="w-5 h-5 text-white" />
                        </div>
                        Tags
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Add keywords to your templates for better organization and searchability.
                    </p>
                </div>
            </div>

            {/* WordPress-style Help Box */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex gap-3">
                <HelpCircle className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <div className="text-sm text-purple-800">
                    <p className="font-medium mb-1">How tags work</p>
                    <p className="text-purple-700">
                        Tags are keywords you can assign to your templates. Unlike categories, a template 
                        can have multiple tags. Use tags to describe specific attributes like &quot;summer&quot;, 
                        &quot;sale&quot;, &quot;featured&quot;, or &quot;holiday&quot;.
                    </p>
                </div>
            </div>

            {/* Two-Column Layout */}
            <div className="grid lg:grid-cols-[320px_1fr] gap-6">
                {/* Left Column: Add/Edit Form + Popular Tags */}
                <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
                    <AddTagForm
                        editingTag={editingTag}
                        onCancelEdit={handleCancelEdit}
                        onSaved={handleSaved}
                    />
                    
                    {/* Popular Tags Widget */}
                    <PopularTags 
                        maxTags={15} 
                        onTagClick={handlePopularTagClick}
                    />
                </div>

                {/* Right Column: Tags Table */}
                <div className="min-w-0">
                    <TagsTable onEdit={handleEdit} />
                </div>
            </div>
        </div>
    );
}
