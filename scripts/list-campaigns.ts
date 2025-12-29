import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listCampaigns() {
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching campaigns:', error);
        return;
    }

    console.log('Recent Campaigns:');
    campaigns.forEach(c => {
        console.log(`ID: ${c.id}, Name: ${c.name}, Created: ${c.created_at}`);
    });
}

listCampaigns();
