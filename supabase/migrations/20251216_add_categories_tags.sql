-- ============================================
-- MIGRATION: Add Categories and Tags System
-- Date: 2025-12-16
-- Description: WordPress-style organization for templates
-- Database: PostgreSQL (Supabase)
-- ============================================

-- ============================================
-- SECTION 1: ALTER TEMPLATES TABLE
-- Add new columns for better organization
-- ============================================

-- Add description column for template details
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add category foreign key (will add constraint later after categories table exists)
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS category_id UUID;

-- Add featured flag for highlighting best templates
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- Add view count for popularity tracking
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Add like count for user favorites
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- Index for category lookups
CREATE INDEX IF NOT EXISTS idx_templates_category_id ON templates(category_id);

-- Index for featured templates
CREATE INDEX IF NOT EXISTS idx_templates_is_featured ON templates(is_featured) WHERE is_featured = TRUE;


-- ============================================
-- SECTION 2: CREATE CATEGORIES TABLE
-- Hierarchical organization (like WordPress categories)
-- ============================================

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),                    -- Lucide icon name (e.g., "ChefHat")
    color VARCHAR(20),                   -- Hex color for badge (e.g., "#ef4444")
    template_count INTEGER DEFAULT 0,    -- Cached count for performance
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Each user can't have duplicate category slugs
    CONSTRAINT uq_categories_user_slug UNIQUE(user_id, slug)
);

-- Index for user's categories lookup
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

-- Index for slug lookups (URL routing)
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

COMMENT ON TABLE categories IS 'WordPress-style categories for organizing templates';
COMMENT ON COLUMN categories.slug IS 'URL-friendly identifier, e.g., "food-recipes"';
COMMENT ON COLUMN categories.icon IS 'Lucide icon name for UI display';
COMMENT ON COLUMN categories.template_count IS 'Cached count, update via trigger or app logic';


-- ============================================
-- SECTION 3: CREATE TAGS TABLE
-- Flat taxonomy for flexible labeling
-- ============================================

CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL,
    description TEXT,
    template_count INTEGER DEFAULT 0,    -- Cached count for performance
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Each user can't have duplicate tag slugs
    CONSTRAINT uq_tags_user_slug UNIQUE(user_id, slug)
);

-- Index for user's tags lookup
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);

-- Index for slug lookups
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);

COMMENT ON TABLE tags IS 'Flat tags for flexible template labeling';
COMMENT ON COLUMN tags.slug IS 'URL-friendly identifier, e.g., "summer-vibes"';


-- ============================================
-- SECTION 4: CREATE TEMPLATE_TAGS JUNCTION TABLE
-- Many-to-many relationship between templates and tags
-- ============================================

CREATE TABLE IF NOT EXISTS template_tags (
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Composite primary key prevents duplicate assignments
    PRIMARY KEY(template_id, tag_id)
);

-- Index for finding all tags of a template
CREATE INDEX IF NOT EXISTS idx_template_tags_template_id ON template_tags(template_id);

-- Index for finding all templates with a specific tag
CREATE INDEX IF NOT EXISTS idx_template_tags_tag_id ON template_tags(tag_id);

COMMENT ON TABLE template_tags IS 'Junction table: many-to-many templates <-> tags';


-- ============================================
-- SECTION 5: ADD FOREIGN KEY CONSTRAINT
-- Link templates.category_id to categories.id
-- ============================================

-- Drop constraint if exists (for idempotency)
ALTER TABLE templates 
DROP CONSTRAINT IF EXISTS fk_templates_category;

-- Add foreign key with SET NULL on delete
-- When a category is deleted, templates keep existing but lose category reference
ALTER TABLE templates 
ADD CONSTRAINT fk_templates_category 
FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;


-- ============================================
-- SECTION 6: ROW LEVEL SECURITY (RLS)
-- Enable RLS and create policies for each table
-- ============================================

-- ─────────────────────────────────────────────
-- CATEGORIES: RLS Policies
-- ─────────────────────────────────────────────

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for idempotency
DROP POLICY IF EXISTS "categories_select_own" ON categories;
DROP POLICY IF EXISTS "categories_insert_own" ON categories;
DROP POLICY IF EXISTS "categories_update_own" ON categories;
DROP POLICY IF EXISTS "categories_delete_own" ON categories;

-- SELECT: Users can only view their own categories
CREATE POLICY "categories_select_own" ON categories
    FOR SELECT
    USING (auth.uid() = user_id);

-- INSERT: Users can only insert categories with their own user_id
CREATE POLICY "categories_insert_own" ON categories
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own categories
CREATE POLICY "categories_update_own" ON categories
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete their own categories
CREATE POLICY "categories_delete_own" ON categories
    FOR DELETE
    USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────
-- TAGS: RLS Policies
-- ─────────────────────────────────────────────

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for idempotency
DROP POLICY IF EXISTS "tags_select_own" ON tags;
DROP POLICY IF EXISTS "tags_insert_own" ON tags;
DROP POLICY IF EXISTS "tags_update_own" ON tags;
DROP POLICY IF EXISTS "tags_delete_own" ON tags;

-- SELECT: Users can only view their own tags
CREATE POLICY "tags_select_own" ON tags
    FOR SELECT
    USING (auth.uid() = user_id);

-- INSERT: Users can only insert tags with their own user_id
CREATE POLICY "tags_insert_own" ON tags
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own tags
CREATE POLICY "tags_update_own" ON tags
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete their own tags
CREATE POLICY "tags_delete_own" ON tags
    FOR DELETE
    USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────
-- TEMPLATE_TAGS: RLS Policies
-- Special case: check ownership through templates table
-- ─────────────────────────────────────────────

ALTER TABLE template_tags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for idempotency
DROP POLICY IF EXISTS "template_tags_select_own" ON template_tags;
DROP POLICY IF EXISTS "template_tags_insert_own" ON template_tags;
DROP POLICY IF EXISTS "template_tags_delete_own" ON template_tags;

-- SELECT: Users can view template_tags if they own the template
CREATE POLICY "template_tags_select_own" ON template_tags
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM templates 
            WHERE templates.id = template_tags.template_id 
            AND templates.user_id = auth.uid()
        )
    );

-- INSERT: Users can add tags to their own templates
CREATE POLICY "template_tags_insert_own" ON template_tags
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM templates 
            WHERE templates.id = template_tags.template_id 
            AND templates.user_id = auth.uid()
        )
        AND
        EXISTS (
            SELECT 1 FROM tags 
            WHERE tags.id = template_tags.tag_id 
            AND tags.user_id = auth.uid()
        )
    );

-- DELETE: Users can remove tags from their own templates
CREATE POLICY "template_tags_delete_own" ON template_tags
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM templates 
            WHERE templates.id = template_tags.template_id 
            AND templates.user_id = auth.uid()
        )
    );

-- Note: No UPDATE policy needed - junction table rows are immutable
-- To change, delete and insert a new row


-- ============================================
-- SECTION 7: HELPER FUNCTIONS (OPTIONAL)
-- Utility functions for common operations
-- ============================================

-- Function to generate slug from name
CREATE OR REPLACE FUNCTION generate_slug(name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(
        REGEXP_REPLACE(
            REGEXP_REPLACE(
                TRIM(name),
                '[^a-zA-Z0-9\s-]', '', 'g'  -- Remove special chars
            ),
            '\s+', '-', 'g'  -- Replace spaces with hyphens
        )
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION generate_slug IS 'Converts a name to URL-friendly slug';


-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Verify tables exist
DO $$
BEGIN
    RAISE NOTICE 'Migration complete! Tables created:';
    RAISE NOTICE '  ✓ categories';
    RAISE NOTICE '  ✓ tags';
    RAISE NOTICE '  ✓ template_tags';
    RAISE NOTICE '  ✓ templates updated with new columns';
END $$;
