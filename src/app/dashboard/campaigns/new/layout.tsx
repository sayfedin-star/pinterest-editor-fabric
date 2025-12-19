// Force dynamic rendering for this route since it uses client-side auth
export const dynamic = 'force-dynamic';

export default function NewCampaignLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
