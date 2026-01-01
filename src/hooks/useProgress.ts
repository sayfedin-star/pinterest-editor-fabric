'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface CampaignProgress {
    campaignId: string;
    total: number;
    completed: number;
    failed: number;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'unknown';
    startedAt?: string;
    completedAt?: string;
    errors?: string[];
}

interface UseProgressOptions {
    /** Polling interval in milliseconds (default: 2000) */
    interval?: number;
    /** Auto-stop polling when status is completed/failed (default: true) */
    autoStop?: boolean;
    /** Callback when progress updates */
    onUpdate?: (progress: CampaignProgress) => void;
    /** Callback when generation completes */
    onComplete?: (progress: CampaignProgress) => void;
    /** Callback when generation fails */
    onError?: (progress: CampaignProgress) => void;
}

/**
 * React hook for polling campaign generation progress
 * 
 * @example
 * const { progress, isPolling, start, stop } = useProgress(campaignId, {
 *     onComplete: (p) => toast.success(`Generated ${p.completed} pins!`),
 * });
 * 
 * return (
 *     <div>
 *         Progress: {progress?.completed}/{progress?.total}
 *         ({Math.round((progress?.completed / progress?.total) * 100)}%)
 *     </div>
 * );
 */
export function useProgress(
    campaignId: string | null,
    options: UseProgressOptions = {}
) {
    const {
        interval = 2000,
        autoStop = true,
        onUpdate,
        onComplete,
        onError,
    } = options;

    const [progress, setProgress] = useState<CampaignProgress | null>(null);
    const [isPolling, setIsPolling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastStatusRef = useRef<string | null>(null);

    const fetchProgress = useCallback(async () => {
        if (!campaignId) return null;
        
        try {
            const res = await fetch(`/api/campaign-progress/${campaignId}`);
            if (!res.ok) {
                throw new Error('Failed to fetch progress');
            }
            
            const data: CampaignProgress = await res.json();
            setProgress(data);
            setError(null);
            
            // Call onUpdate callback
            onUpdate?.(data);
            
            // Check for status changes
            if (data.status !== lastStatusRef.current) {
                lastStatusRef.current = data.status;
                
                if (data.status === 'completed') {
                    onComplete?.(data);
                } else if (data.status === 'failed') {
                    onError?.(data);
                }
            }
            
            return data;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            return null;
        }
    }, [campaignId, onUpdate, onComplete, onError]);

    const start = useCallback(() => {
        if (!campaignId || isPolling) return;
        
        setIsPolling(true);
        lastStatusRef.current = null;
        
        // Fetch immediately
        fetchProgress();
        
        // Then poll at interval
        intervalRef.current = setInterval(async () => {
            const data = await fetchProgress();
            
            // Auto-stop when done
            if (autoStop && data && (data.status === 'completed' || data.status === 'failed')) {
                stop();
            }
        }, interval);
    }, [campaignId, isPolling, interval, autoStop, fetchProgress]);

    const stop = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setIsPolling(false);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    // Reset when campaignId changes
    useEffect(() => {
        stop();
        setProgress(null);
        setError(null);
        lastStatusRef.current = null;
    }, [campaignId, stop]);

    // Computed values
    const percentage = progress?.total 
        ? Math.round((progress.completed / progress.total) * 100) 
        : 0;
    
    const isComplete = progress?.status === 'completed';
    const isFailed = progress?.status === 'failed';
    const isProcessing = progress?.status === 'processing';

    return {
        progress,
        percentage,
        isPolling,
        isComplete,
        isFailed,
        isProcessing,
        error,
        start,
        stop,
        refresh: fetchProgress,
    };
}
