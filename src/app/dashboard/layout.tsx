// Force dynamic rendering for all dashboard routes (uses auth hooks)
export const dynamic = 'force-dynamic';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
    return <DashboardLayout>{children}</DashboardLayout>;
}
