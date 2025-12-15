'use client';

import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore, Toast as ToastType } from '@/stores/toastStore';
import { cn } from '@/lib/utils';

export function ToastContainer() {
    const toasts = useToastStore((s) => s.toasts);
    const removeToast = useToastStore((s) => s.removeToast);

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    toast={toast}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </div>
    );
}

function Toast({ toast, onClose }: { toast: ToastType; onClose: () => void }) {
    const { type, message } = toast;

    const styles = {
        success: {
            bg: 'bg-white',
            border: 'border-l-4 border-l-green-500',
            icon: <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />,
            text: 'text-gray-800'
        },
        error: {
            bg: 'bg-white',
            border: 'border-l-4 border-l-red-500',
            icon: <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />,
            text: 'text-gray-800'
        },
        warning: {
            bg: 'bg-white',
            border: 'border-l-4 border-l-yellow-500',
            icon: <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />,
            text: 'text-gray-800'
        },
        info: {
            bg: 'bg-white',
            border: 'border-l-4 border-l-blue-500',
            icon: <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />,
            text: 'text-gray-800'
        }
    };

    const style = styles[type];

    return (
        <div
            className={cn(
                'flex items-start gap-3 min-w-[320px] max-w-md p-4 rounded-lg shadow-lg border border-gray-200',
                'pointer-events-auto animate-slide-in-right',
                style.bg,
                style.border
            )}
        >
            {style.icon}
            <p className={cn('flex-1 text-sm font-medium', style.text)}>
                {message}
            </p>
            <button
                onClick={onClose}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close notification"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
