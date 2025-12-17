'use client';

import { TemplatesPageContainer } from './components';

export default function TemplatesPage() {
    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
                <p className="text-gray-500 mt-1">Manage your templates and create new designs.</p>
            </div>
            
            {/* Main Content */}
            <TemplatesPageContainer />
        </div>
    );
}
