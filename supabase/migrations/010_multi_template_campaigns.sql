-- ============================================
-- Multi-Template Campaign Support
-- Purpose: Enable campaigns to use multiple templates with distribution modes
-- ============================================

-- Add template_ids array column (stores multiple template UUIDs)
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS template_ids UUID[] DEFAULT NULL;

-- Add distribution mode column
-- Values: 'sequential', 'random', 'equal', 'csv_column'
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS distribution_mode VARCHAR(20) DEFAULT 'sequential';

-- Add template snapshot (preserves template data at campaign creation time)
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS template_snapshot JSONB DEFAULT NULL;

-- Add statistics tracking (template distribution, timing, etc.)
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS statistics JSONB DEFAULT '{}';

-- ============================================
-- Migrate existing data (single template → array)
-- ============================================
UPDATE public.campaigns 
SET template_ids = ARRAY[template_id]
WHERE template_ids IS NULL AND template_id IS NOT NULL;

-- ============================================
-- Constraints
-- ============================================

-- Ensure distribution_mode is one of the allowed values
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'campaigns_distribution_mode_check'
    ) THEN
        ALTER TABLE public.campaigns 
        ADD CONSTRAINT campaigns_distribution_mode_check 
        CHECK (distribution_mode IN ('sequential', 'random', 'equal', 'csv_column'));
    END IF;
END $$;

-- Ensure template_ids has between 1 and 10 templates when set
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'campaigns_template_ids_count_check'
    ) THEN
        ALTER TABLE public.campaigns 
        ADD CONSTRAINT campaigns_template_ids_count_check 
        CHECK (
            template_ids IS NULL 
            OR (array_length(template_ids, 1) >= 1 AND array_length(template_ids, 1) <= 10)
        );
    END IF;
END $$;

-- ============================================
-- Indexes
-- ============================================

-- GIN index for efficient array lookups (e.g., "find campaigns using template X")
CREATE INDEX IF NOT EXISTS idx_campaigns_template_ids 
ON public.campaigns USING GIN(template_ids);

-- Index on distribution_mode for filtering
CREATE INDEX IF NOT EXISTS idx_campaigns_distribution_mode 
ON public.campaigns(distribution_mode);

-- ============================================
-- Documentation
-- ============================================
COMMENT ON COLUMN public.campaigns.template_ids IS 
    'Array of template UUIDs for multi-template campaigns (1-10 templates)';

COMMENT ON COLUMN public.campaigns.distribution_mode IS 
    'How templates are assigned to rows: sequential, random, equal, csv_column';

COMMENT ON COLUMN public.campaigns.template_snapshot IS 
    'Snapshot of template configurations at campaign creation time';

COMMENT ON COLUMN public.campaigns.statistics IS 
    'Generation statistics: template distribution counts, timing data';
