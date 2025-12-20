import Link from "next/link";
import { cn } from "@/lib/utils";

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
} as const;

export interface QuickActionCardProps {
  title: string;
  description: string;
  icon: string;
  variant: keyof typeof ACTION_VARIANTS;
  href: string;
}

export function QuickActionCard({ title, description, icon, variant, href }: QuickActionCardProps) {
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
