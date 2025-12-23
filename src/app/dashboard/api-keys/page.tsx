'use client';

/**
 * API Keys Dashboard Page
 * 
 * Allows users to create, view, and revoke their API keys
 * for accessing the /api/v1/generate endpoint.
 */

import { useState, useEffect, useCallback } from 'react';
import { Key, Plus, Copy, Check, Trash2, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface ApiKeyListItem {
    id: string;
    name: string;
    key_prefix: string;
    is_active: boolean;
    created_at: string;
    last_used_at: string | null;
}

interface CreateKeyResult {
    key: string;
    apiKey: ApiKeyListItem;
}

// Helper to get auth headers with access token
async function getAuthHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
        throw new Error('Not authenticated');
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
    };
}

export default function ApiKeysPage() {
    const [keys, setKeys] = useState<ApiKeyListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Create key modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [createdKey, setCreatedKey] = useState<CreateKeyResult | null>(null);
    
    // Copy state
    const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

    // Fetch keys
    const fetchKeys = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            const headers = await getAuthHeaders();
            const res = await fetch('/api/keys', { 
                headers,
                credentials: 'include' 
            });
            const data = await res.json();
            
            if (data.success) {
                setKeys(data.data);
            } else {
                setError(data.error || 'Failed to load API keys');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to connect to server');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchKeys();
    }, [fetchKeys]);

    // Create key
    const handleCreateKey = async () => {
        if (!newKeyName.trim()) return;
        
        try {
            setIsCreating(true);
            const headers = await getAuthHeaders();
            const res = await fetch('/api/keys', {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({ name: newKeyName.trim() }),
            });
            
            const data = await res.json();
            
            if (data.success) {
                setCreatedKey(data.data);
                fetchKeys(); // Refresh list
            } else {
                setError(data.error || 'Failed to create API key');
            }
        } catch {
            setError('Failed to create API key');
        } finally {
            setIsCreating(false);
        }
    };

    // Revoke key
    const handleRevokeKey = async (keyId: string) => {
        if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
            return;
        }
        
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`/api/keys?id=${keyId}`, {
                method: 'DELETE',
                headers,
                credentials: 'include',
            });
            
            const data = await res.json();
            
            if (data.success) {
                fetchKeys(); // Refresh list
            } else {
                setError(data.error || 'Failed to revoke API key');
            }
        } catch {
            setError('Failed to revoke API key');
        }
    };

    // Copy to clipboard
    const copyToClipboard = async (text: string, keyId: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedKeyId(keyId);
            setTimeout(() => setCopiedKeyId(null), 2000);
        } catch {
            setError('Failed to copy to clipboard');
        }
    };

    // Close create modal and reset state
    const closeCreateModal = () => {
        setShowCreateModal(false);
        setNewKeyName('');
        setCreatedKey(null);
    };

    // Format date
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Never';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    return (
        <>
            <div className="p-6 max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Key className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
                            <p className="text-sm text-gray-500">
                                Manage keys for the /api/v1/generate endpoint
                            </p>
                        </div>
                    </div>
                    
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Create Key
                    </button>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <span className="text-red-800">{error}</span>
                        <button
                            onClick={() => setError(null)}
                            className="ml-auto text-red-600 hover:text-red-800"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Loading State */}
                {isLoading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                        <span className="ml-2 text-gray-600">Loading API keys...</span>
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && keys.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                        <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No API Keys</h3>
                        <p className="text-gray-500 mb-4">
                            Create your first API key to start generating pins programmatically.
                        </p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Create Your First Key
                        </button>
                    </div>
                )}

                {/* Keys Table */}
                {!isLoading && keys.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Name</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Key</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Last Used</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Created</th>
                                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {keys.map((key) => (
                                    <tr key={key.id} className={cn(
                                        "hover:bg-gray-50 transition-colors",
                                        !key.is_active && "opacity-60"
                                    )}>
                                        <td className="px-4 py-3">
                                            <span className="font-medium text-gray-900">{key.name}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                                                {key.key_prefix}...
                                            </code>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn(
                                                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                                                key.is_active 
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-gray-100 text-gray-600"
                                            )}>
                                                {key.is_active ? 'Active' : 'Revoked'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {formatDate(key.last_used_at)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {formatDate(key.created_at)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {key.is_active && (
                                                <button
                                                    onClick={() => handleRevokeKey(key.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Revoke key"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Usage Info */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <h4 className="font-medium text-blue-900 mb-2">How to use your API key</h4>
                    <p className="text-sm text-blue-800 mb-2">
                        Include your key in the request header:
                    </p>
                    <code className="block text-sm bg-blue-100 px-3 py-2 rounded font-mono text-blue-900">
                        Authorization: Bearer pingen_your_key_here
                    </code>
                </div>
            </div>

            {/* Create Key Modal */}
            {showCreateModal && (
                <div 
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                    onClick={(e) => e.target === e.currentTarget && closeCreateModal()}
                >
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {createdKey ? 'API Key Created!' : 'Create API Key'}
                            </h2>
                        </div>
                        
                        <div className="p-6">
                            {!createdKey ? (
                                <>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Key Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newKeyName}
                                        onChange={(e) => setNewKeyName(e.target.value)}
                                        placeholder="e.g., Google Sheets Integration"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
                                    />
                                    <p className="text-sm text-gray-500 mt-2">
                                        Choose a descriptive name to identify this key.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <p className="text-sm text-yellow-800">
                                            <strong>Important:</strong> Copy your API key now. You won&apos;t be able to see it again!
                                        </p>
                                    </div>
                                    
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Your API Key
                                    </label>
                                    <div className="flex gap-2">
                                        <KeyDisplay 
                                            keyValue={createdKey.key}
                                            onCopy={() => copyToClipboard(createdKey.key, 'new-key')}
                                            copied={copiedKeyId === 'new-key'}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                        
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                onClick={closeCreateModal}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                {createdKey ? 'Close' : 'Cancel'}
                            </button>
                            
                            {!createdKey && (
                                <button
                                    onClick={handleCreateKey}
                                    disabled={!newKeyName.trim() || isCreating}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Create Key
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Key Display Component with masked/show toggle
function KeyDisplay({ 
    keyValue, 
    onCopy, 
    copied 
}: { 
    keyValue: string; 
    onCopy: () => void; 
    copied: boolean;
}) {
    const [isVisible, setIsVisible] = useState(false);
    
    return (
        <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
            <code className="flex-1 font-mono text-sm text-gray-900 break-all">
                {isVisible ? keyValue : '•'.repeat(Math.min(keyValue.length, 40))}
            </code>
            <button
                onClick={() => setIsVisible(!isVisible)}
                className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                title={isVisible ? 'Hide key' : 'Show key'}
            >
                {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
                onClick={onCopy}
                className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                title="Copy to clipboard"
            >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </button>
        </div>
    );
}
