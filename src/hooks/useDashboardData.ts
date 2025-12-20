import { useState, useEffect, useCallback } from 'react';
import { getDashboardStats, getRecentProjects, DashboardStats, DashboardProject } from '@/lib/db/dashboard';

export function useDashboardData() {
    const [stats, setStats] = useState<DashboardStats>({
        templates: 0,
        activeCampaigns: 0,
        pinsGenerated: 0,
        thisMonthPins: 0
    });
    
    const [projects, setProjects] = useState<DashboardProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            const [statsData, projectsData] = await Promise.all([
                getDashboardStats(),
                getRecentProjects()
            ]);

            setStats(statsData);
            setProjects(projectsData);
        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { stats, projects, loading, error, refresh: fetchData };
}
