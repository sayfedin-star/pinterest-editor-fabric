import { cn } from "@/lib/utils";

const STAT_VARIANTS = {
  blue: { bg: "bg-accent-1 dark:bg-accent-1/20", text: "text-primary-creative dark:text-accent-1" },
  purple: { bg: "bg-accent-3 dark:bg-accent-3/20", text: "text-purple-600 dark:text-accent-3" },
  teal: { bg: "bg-tertiary-creative/20 dark:bg-tertiary-creative/20", text: "text-tertiary-creative" },
  orange: { bg: "bg-accent-2 dark:bg-accent-2/20", text: "text-orange-600 dark:text-accent-2" },
} as const;

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  trend?: string;
  variant: keyof typeof STAT_VARIANTS;
}

export function StatCard({ label, value, icon, trend, variant }: StatCardProps) {
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
