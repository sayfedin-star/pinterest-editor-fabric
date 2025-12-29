-- ============================================
-- Add CSV URL to Campaigns & Setup Storage
-- Purpose: Move large CSV data from DB rows to Storage
-- ============================================

-- 1. Add csv_url column to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS csv_url TEXT;

COMMENT ON COLUMN public.campaigns.csv_url IS 'URL to the CSV file in storage (replaces csv_data for large files)';

-- 2. Create storage bucket for campaign uploads
-- We use ON CONFLICT to avoid errors if it already exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'campaign-uploads', 
    'campaign-uploads', 
    true,
    10485760, -- 10MB limit
    ARRAY['text/csv', 'application/vnd.ms-excel', 'text/plain']
)
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Storage Policies (Row Level Security)

-- Enable RLS on objects if not already enabled (it usually is)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can upload their own files (Folder structure: {userId}/{filename})
-- We check that the folder name matches the user's ID
CREATE POLICY "Users can upload campaign files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'campaign-uploads' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own files
CREATE POLICY "Users can view campaign files"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'campaign-uploads' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own files
CREATE POLICY "Users can update campaign files"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'campaign-uploads' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete campaign files"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'campaign-uploads' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);
