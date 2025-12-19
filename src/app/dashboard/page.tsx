'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@/lib/utils';
import { DashboardEmptyState } from '@/components/ui/EmptyStates';

// --- MOCK DATA ---
const STATS = {
  templates: 12,
  activeCampaigns: 5,
  pinsGenerated: 847,
  thisMonth: 234
};

const PROJECTS = [
  {
    id: '1',
    title: 'Summer Products 2025',
    status: 'completed',
    progress: 100,
    generated: 50,
    total: 50,
    color: 'blue',
    icon: 'layers'
  },
  {
    id: '2',
    title: 'Recipe Cards Batch',
    status: 'in_progress',
    progress: 40,
    generated: 10,
    total: 25,
    color: 'purple',
    icon: 'restaurant_menu'
  },
  {
    id: '3',
    title: 'Blog Post Headers',
    status: 'pending',
    progress: 0,
    generated: 0,
    total: 30,
    color: 'orange',
    icon: 'article'
  },
  {
    id: '4',
    title: 'Holiday Collection \'24',
    status: 'paused',
    progress: 20,
    generated: 5,
    total: 25,
    color: 'green',
    icon: 'shopping_bag'
  }
];

// --- COLOR MAPS ---
const STAT_VARIANTS = {
  blue: { bg: "bg-accent-1 dark:bg-accent-1/20", text: "text-primary-creative dark:text-accent-1" },
  purple: { bg: "bg-accent-3 dark:bg-accent-3/20", text: "text-purple-600 dark:text-accent-3" },
  teal: { bg: "bg-tertiary-creative/20 dark:bg-tertiary-creative/20", text: "text-tertiary-creative" },
  orange: { bg: "bg-accent-2 dark:bg-accent-2/20", text: "text-orange-600 dark:text-accent-2" },
};

const ACTION_VARIANTS = {
  purple: {
     cardBg: "bg-gradient-to-br from-purple-50 to-blue-50 dark:from-surface-dark dark:to-surface-dark/90",
     iconBg: "bg-gradient-to-br from-primary-creative to-accent-1",
     shadow: "shadow-purple-500/30"
  },
  pink: {
     cardBg: "bg-gradient-to-br from-pink-50 to-orange-50 dark:from-surface-dark dark:to-surface-dark/90",
     iconBg: "bg-gradient-to-br from-secondary-creative to-accent-2",
     shadow: "shadow-pink-500/30"
  },
  green: {
     cardBg: "bg-gradient-to-br from-green-50 to-teal-50 dark:from-surface-dark dark:to-surface-dark/90",
     iconBg: "bg-gradient-to-br from-tertiary-creative to-green-300",
     shadow: "shadow-green-500/30"
  }
};

const PROJECT_VARIANTS: Record<string, any> = {
  blue: {
    overlay: "bg-gradient-to-br from-blue-300/30 to-blue-500/30 dark:from-blue-600/30 dark:to-blue-800/30",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconText: "text-blue-600 dark:text-blue-400",
    badgeBg: "bg-blue-100 dark:bg-blue-900/40",
    badgeText: "text-blue-700 dark:text-blue-300",
    barBg: "bg-blue-500",
    statusText: "text-blue-600 dark:text-blue-400"
  },
  purple: {
    overlay: "bg-gradient-to-br from-purple-300/30 to-purple-500/30 dark:from-purple-600/30 dark:to-purple-800/30",
    iconBg: "bg-purple-100 dark:bg-purple-900/30",
    iconText: "text-purple-600 dark:text-purple-400",
    badgeBg: "bg-purple-100 dark:bg-purple-900/40",
    badgeText: "text-purple-700 dark:text-purple-300",
    barBg: "bg-purple-500",
    statusText: "text-purple-600 dark:text-purple-400"
  },
  orange: {
    overlay: "bg-gradient-to-br from-orange-300/30 to-orange-500/30 dark:from-orange-600/30 dark:to-orange-800/30",
    iconBg: "bg-orange-100 dark:bg-orange-900/30",
    iconText: "text-orange-600 dark:text-orange-400",
    badgeBg: "bg-orange-100 dark:bg-orange-900/40",
    badgeText: "text-orange-700 dark:text-orange-300",
    barBg: "bg-orange-500",
    statusText: "text-orange-600 dark:text-orange-400"
  },
  green: {
    overlay: "bg-gradient-to-br from-green-300/30 to-green-500/30 dark:from-green-600/30 dark:to-green-800/30",
    iconBg: "bg-green-100 dark:bg-green-900/30",
    iconText: "text-green-600 dark:text-green-400",
    badgeBg: "bg-green-100 dark:bg-green-900/40",
    badgeText: "text-green-700 dark:text-green-300",
    barBg: "bg-green-500",
    statusText: "text-green-600 dark:text-green-400"
  },
   gray: { // Fallback/Pending
    overlay: "bg-gradient-to-br from-gray-300/30 to-gray-500/30 dark:from-gray-600/30 dark:to-gray-800/30",
    iconBg: "bg-gray-100 dark:bg-gray-900/30",
    iconText: "text-gray-600 dark:text-gray-400",
    badgeBg: "bg-gray-100 dark:bg-gray-900/40",
    badgeText: "text-gray-700 dark:text-gray-300",
    barBg: "bg-gray-500",
    statusText: "text-gray-600 dark:text-gray-400"
  }
};


// --- COMPONENTS ---

function StatCard({ label, value, icon, trend, variant }: { label: string, value: any, icon: string, trend?: string, variant: keyof typeof STAT_VARIANTS }) {
  const styles = STAT_VARIANTS[variant];
  return (
    <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-xl shadow-creative-md flex flex-col justify-between transform transition-transform hover:scale-105 duration-200 group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 font-body">{label}</p>
          <p className="text-4xl font-heading font-bold text-gray-900 dark:text-white mt-2">{value}</p>
          {trend && (
             <p className="text-sm font-medium text-green-500 mt-2 flex items-center">
                <span className="material-symbols-outlined text-base mr-1">trending_up</span> {trend}
            </p>
          )}
        </div>
        <div className={cn("h-12 w-12 rounded-lg flex items-center justify-center group-hover:rotate-6 transition-transform", styles.bg, styles.text)}>
          <span className="material-symbols-outlined text-3xl">{icon}</span>
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({ title, description, icon, variant, href }: { title: string, description: string, icon: string, variant: keyof typeof ACTION_VARIANTS, href: string }) {
  const styles = ACTION_VARIANTS[variant];
  return (
    <Link href={href} className={cn(
        "group block p-8 rounded-2xl shadow-creative-md hover:shadow-creative-lg transition-all duration-300 transform hover:-translate-y-1",
        styles.cardBg
    )}>
      <div className="flex flex-col items-center text-center">
        <div className={cn(
            "h-16 w-16 rounded-xl flex items-center justify-center text-white shadow-lg mb-5 group-hover:scale-110 transition-transform duration-300",
            styles.iconBg,
            styles.shadow
        )}>
          <span className="material-symbols-outlined text-4xl">{icon}</span>
        </div>
        <h4 className="text-xl font-heading font-semibold text-gray-900 dark:text-white mb-2">{title}</h4>
        <p className="text-md text-gray-500 dark:text-gray-400 font-body">{description}</p>
        <span className={cn(
            "mt-4 material-symbols-outlined transition-colors text-3xl",
            "text-gray-400 group-hover:text-primary-creative dark:group-hover:text-accent-1"
        )}>arrow_right_alt</span>
      </div>
    </Link>
  );
}

function ProjectCard({ project }: { project: typeof PROJECTS[0] }) {
  const statusConfig = {
    completed: { text: "Completed", icon: "check_circle" },
    in_progress: { text: "In Progress", icon: "play_arrow" },
    pending: { text: "Pending", icon: "pause" },
    paused: { text: "Paused", icon: "error" }
  };

  const statusInfo = statusConfig[project.status as keyof typeof statusConfig];
  const styles = PROJECT_VARIANTS[project.color] || PROJECT_VARIANTS['gray'];

  return (
    <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl shadow-creative-md relative overflow-hidden group hover:shadow-creative-lg transition-all duration-300">
      <div className={cn(
          "absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity",
           styles.overlay
      )}></div>
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className={cn(
                "h-12 w-12 rounded-lg flex items-center justify-center",
                styles.iconBg, styles.iconText
            )}>
              <span className="material-symbols-outlined text-3xl">{project.icon}</span>
            </div>
            <div>
              <h4 className="text-lg font-heading font-bold text-gray-900 dark:text-white">{project.title}</h4>
              <p className={cn("text-sm flex items-center mt-1", styles.statusText)}>
                <span className="material-symbols-outlined text-base mr-1">{statusInfo.icon}</span> {statusInfo.text}
              </p>
            </div>
          </div>
          <span className={cn(
              "text-sm font-heading font-bold px-3 py-1 rounded-md",
              styles.badgeBg, styles.badgeText
          )}>{project.progress}%</span>
        </div>

        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mb-4">
          <div className={cn("h-2 rounded-full", styles.barBg)} style={{ width: `${project.progress}%` }}></div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-700">
          <span className="font-body"><strong className="text-gray-900 dark:text-gray-200">{project.generated}</strong> of {project.total} pins</span>
          <span className="material-symbols-outlined text-lg cursor-pointer hover:text-primary-creative dark:hover:text-accent-1 transition-colors">arrow_right_alt</span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const [hasData, setHasData] = useState(true);

  if (!hasData) {
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
            value={STATS.templates} 
            icon="layers" 
            variant="blue"
          />
          <StatCard 
            label="Active Campaigns" 
            value={STATS.activeCampaigns} 
            icon="folder" 
            variant="purple"
          />
          <StatCard 
            label="Pins Generated" 
            value={STATS.pinsGenerated} 
            icon="image" 
            trend="+234 this month"
            variant="teal"
          />
          <StatCard 
            label="This Month" 
            value={STATS.thisMonth} 
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {PROJECTS.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
        
        <div className="h-10"></div>
      </div>
    </main>
  );
}
