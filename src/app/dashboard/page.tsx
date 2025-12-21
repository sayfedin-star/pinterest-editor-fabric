'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { StatCard } from '@/components/dashboard/StatCard';
import { QuickActionCard } from '@/components/dashboard/QuickActionCard';
import { ProjectCard } from '@/components/dashboard/ProjectCard';
import { DashboardEmptyState } from '@/components/ui/EmptyStates';

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const { stats, projects, loading } = useDashboardData();

  if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center p-8 bg-canvas-light dark:bg-canvas-dark">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary-creative/30 border-t-primary-creative rounded-full animate-spin"></div>
                <p className="text-gray-500 font-medium">Loading your creative space...</p>
            </div>
        </div>
      );
  }

  // If no data loaded (and not loading), show empty state?
  // Actually, we might have 0 stats but that's valid data.
  // Empty state should be more specific, e.g. if no templates AND no campaigns.
  if (!loading && stats.templates === 0 && stats.activeCampaigns === 0 && projects.length === 0) {
      return <DashboardEmptyState />;
  }

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-canvas-light dark:bg-canvas-dark font-body">
      <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-heading font-bold text-gray-900 dark:text-white flex items-center">
                Welcome back{currentUser?.email ? `, ${currentUser.email.split('@')[0]}` : ''}! <span className="ml-3 text-3xl">👋</span>
            </h2>
            <p className="text-lg text-gray-500 dark:text-gray-400 mt-2 font-body">Dive into your creative projects and get inspired.</p>
          </div>
          <Link href="/editor" className="mt-6 md:mt-0 bg-gradient-to-r from-primary-creative to-secondary-creative hover:from-primary-creative/90 hover:to-secondary-creative/90 text-white font-heading font-medium py-3 px-8 rounded-full shadow-lg shadow-purple-500/30 flex items-center transition-transform hover:scale-105">
            <span className="material-symbols-outlined text-xl mr-2">add_circle</span>
            Start New Project
          </Link>
        </div>

        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <StatCard 
            label="Total Templates" 
            value={stats.templates} 
            icon="layers" 
            variant="blue"
          />
          <StatCard 
            label="Active Campaigns" 
            value={stats.activeCampaigns} 
            icon="folder" 
            variant="purple"
          />
          <StatCard 
            label="Pins Generated" 
            value={stats.pinsGenerated} 
            icon="image" 
            trend={stats.thisMonthPins > 0 ? `+${stats.thisMonthPins} this month` : undefined}
            variant="teal"
          />
          <StatCard 
            label="This Month" 
            value={stats.thisMonthPins} 
            icon="auto_awesome" 
            variant="orange"
          />
        </div>

        {/* Quick Actions */}
        <h3 className="text-2xl font-heading font-semibold text-gray-900 dark:text-white mb-6">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <QuickActionCard 
            title="New Template" 
            description="Design a reusable pin layout" 
            icon="add" 
            href="/editor"
            variant="purple"
          />
          <QuickActionCard 
            title="Bulk Generate" 
            description="Create pins from CSV data" 
            icon="bolt" 
            href="/dashboard/campaigns/new"
            variant="pink"
          />
          <QuickActionCard 
            title="Browse Templates" 
            description="View and manage your designs" 
            icon="visibility" 
            href="/dashboard/templates"
            variant="green"
          />
        </div>

        {/* Projects / Campaigns */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl text-gray-500 dark:text-gray-400">folder_open</span>
            <h3 className="text-2xl font-heading font-semibold text-gray-900 dark:text-white">Your Projects</h3>
          </div>
          <Link href="/dashboard/campaigns" className="text-md font-heading font-medium text-primary-creative hover:text-purple-700 dark:hover:text-accent-1 flex items-center transition-colors">
            View all
            <span className="material-symbols-outlined text-lg ml-1">chevron_right</span>
          </Link>
        </div>

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {projects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 dark:bg-surface-dark/30 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
             <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">folder_off</span>
             <p className="text-gray-500">No recent campaigns found. Start your first generation!</p>
          </div>
        )}
        
        <div className="h-10"></div>
      </div>
    </main>
  );
}
