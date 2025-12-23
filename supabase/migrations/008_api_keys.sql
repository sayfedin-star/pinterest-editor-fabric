-- ============================================
-- API Keys Table
-- Purpose: Store hashed API keys for external integrations (Google Sheets, etc.)
-- ============================================

-- Create api_keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL,                    -- bcrypt/SHA-256 hash (never store plaintext)
    key_prefix TEXT NOT NULL,                  -- First 10 chars for display: "key_abc123..."
    name TEXT NOT NULL DEFAULT 'Default Key',  -- User-friendly name
    is_active BOOLEAN NOT NULL DEFAULT true,   -- Soft delete / revocation
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ                   -- Track usage for analytics
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON public.api_keys(user_id, is_active) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own API keys
CREATE POLICY "Users can view own api_keys"
    ON public.api_keys
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own API keys
CREATE POLICY "Users can create own api_keys"
    ON public.api_keys
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own API keys (for revocation)
CREATE POLICY "Users can update own api_keys"
    ON public.api_keys
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own API keys
CREATE POLICY "Users can delete own api_keys"
    ON public.api_keys
    FOR DELETE
    USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.api_keys TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE public.api_keys IS 'API keys for external integrations like Google Sheets';
COMMENT ON COLUMN public.api_keys.key_hash IS 'Hashed version of the API key - never store plaintext';
COMMENT ON COLUMN public.api_keys.key_prefix IS 'First 10 characters of key for display purposes';
