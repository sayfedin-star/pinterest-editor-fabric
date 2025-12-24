-- ============================================
-- Fix custom_fonts table structure and add indexes
-- Purpose: Ensure table matches code expectations & optimize queries
-- ============================================

-- 1. Update table structure to match Font interface
-- Add missing columns if they don't exist
ALTER TABLE public.custom_fonts 
ADD COLUMN IF NOT EXISTS family TEXT;

ALTER TABLE public.custom_fonts 
ADD COLUMN IF NOT EXISTS format TEXT CHECK (format IN ('ttf', 'otf', 'woff', 'woff2'));

ALTER TABLE public.custom_fonts 
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('sans-serif', 'serif', 'display', 'script', 'handwriting', 'monospace'));

ALTER TABLE public.custom_fonts 
ADD COLUMN IF NOT EXISTS file_size INTEGER;

ALTER TABLE public.custom_fonts 
ADD COLUMN IF NOT EXISTS file_url TEXT;

ALTER TABLE public.custom_fonts 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Rename 'name' to 'family' if it exists (for backwards compatibility)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'custom_fonts' AND column_name = 'name'
    ) THEN
        -- Copy name to family if family is null
        UPDATE public.custom_fonts SET family = name WHERE family IS NULL;
        
        -- Drop name column
        ALTER TABLE public.custom_fonts DROP COLUMN name;
    END IF;
END $$;

-- 3. Rename 'url' to 'file_url' if it exists (for backwards compatibility)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'custom_fonts' AND column_name = 'url'
    ) THEN
        -- Copy url to file_url if file_url is null
        UPDATE public.custom_fonts SET file_url = url WHERE file_url IS NULL;
        
        -- Drop url column
        ALTER TABLE public.custom_fonts DROP COLUMN url;
    END IF;
END $$;

-- 4. Make critical columns NOT NULL (after backfill)
ALTER TABLE public.custom_fonts 
ALTER COLUMN family SET NOT NULL;

ALTER TABLE public.custom_fonts 
ALTER COLUMN file_url SET NOT NULL;

-- 5. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_custom_fonts_user_id 
ON public.custom_fonts(user_id);

-- CRITICAL: Index for API font lookups by family name
CREATE INDEX IF NOT EXISTS idx_custom_fonts_family 
ON public.custom_fonts(family);

-- Composite index for user-specific font queries
CREATE INDEX IF NOT EXISTS idx_custom_fonts_user_family 
ON public.custom_fonts(user_id, family);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_custom_fonts_category 
ON public.custom_fonts(category) 
WHERE category IS NOT NULL;

-- 6. Add trigger for auto-updating updated_at
CREATE TRIGGER set_custom_fonts_updated_at
    BEFORE UPDATE ON public.custom_fonts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 7. Add comments for documentation
COMMENT ON TABLE public.custom_fonts IS 'User-uploaded custom fonts for templates';
COMMENT ON COLUMN public.custom_fonts.family IS 'Font family name (e.g., "Frosty Christmas Demo")';
COMMENT ON COLUMN public.custom_fonts.file_url IS 'Public URL to font file in storage';
COMMENT ON COLUMN public.custom_fonts.format IS 'Font file format: ttf, otf, woff, or woff2';
COMMENT ON COLUMN public.custom_fonts.category IS 'Font category for organization';
