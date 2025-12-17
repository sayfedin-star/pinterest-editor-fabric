/**
 * Categories Management Page (WordPress-style)
 * 
 * Two-column layout:
 * - Left: Sticky form for adding/editing categories
 * - Right: Data table with search, sort, and bulk actions
 */

'use client';

import React, { useState } from 'react';
import { Folder, HelpCircle } from 'lucide-react';
import { DbCategory } from '@/types/database.types';
import { AddCategoryForm } from '@/components/categories/AddCategoryForm';
import { CategoriesTable } from '@/components/categories/CategoriesTable';

export default function CategoriesPage() {
    const [editingCategory, setEditingCategory] = useState<DbCategory | null>(null);

    const handleEdit = (category: DbCategory) => {
        setEditingCategory(category);
        // Scroll to top on mobile
        if (window.innerWidth < 1024) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleCancelEdit = () => {
        setEditingCategory(null);
    };

    const handleSaved = () => {
        setEditingCategory(null);
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <Folder className="w-5 h-5 text-white" />
                        </div>
                        Categories
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Organize your templates into categories for easy browsing and filtering.
                    </p>
                </div>
            </div>

            {/* WordPress-style Help Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <HelpCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">How categories work</p>
                    <p className="text-blue-700">
                        Categories help organize your templates into groups. Each template can belong to one category. 
                        Use the form on the left to add new categories, or click Edit on any existing category to modify it.
                    </p>
                </div>
            </div>

            {/* Two-Column Layout */}
            <div className="grid lg:grid-cols-[320px_1fr] gap-6">
                {/* Left Column: Add/Edit Form (Sticky on Desktop) */}
                <div className="lg:sticky lg:top-6 lg:self-start">
                    <AddCategoryForm
                        editingCategory={editingCategory}
                        onCancelEdit={handleCancelEdit}
                        onSaved={handleSaved}
                    />
                </div>

                {/* Right Column: Categories Table */}
                <div className="min-w-0">
                    <CategoriesTable onEdit={handleEdit} />
                </div>
            </div>
        </div>
    );
}
