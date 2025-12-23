-- ============================================
-- Add short_id to Templates
-- Purpose: User-friendly template IDs for API/Google Sheets integration
-- Format: TMPL-ABC12345 (8 character nanoid)
-- ============================================

-- Add short_id column (nullable first for existing rows)
ALTER TABLE public.templates 
ADD COLUMN IF NOT EXISTS short_id TEXT;

-- Generate short_ids for existing templates
-- Using MD5 hash of UUID as fallback (will be replaced with nanoid in app)
UPDATE public.templates 
SET short_id = 'TMPL-' || UPPER(SUBSTRING(MD5(id::text) FROM 1 FOR 8))
WHERE short_id IS NULL;

-- Make short_id NOT NULL and UNIQUE after backfill
ALTER TABLE public.templates 
ALTER COLUMN short_id SET NOT NULL;

ALTER TABLE public.templates 
ADD CONSTRAINT templates_short_id_unique UNIQUE (short_id);

-- Create index for efficient lookups by short_id
CREATE INDEX IF NOT EXISTS idx_templates_short_id ON public.templates(short_id);

-- Add comment for documentation
COMMENT ON COLUMN public.templates.short_id IS 'User-friendly template ID for API access (format: TMPL-XXXXXXXX)';
