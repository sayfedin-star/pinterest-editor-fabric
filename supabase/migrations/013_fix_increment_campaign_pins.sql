-- Migration: Fix increment function name and add batch increment support
-- This fixes the mismatch between code (increment_campaign_pins) and old migration (increment_generated_pins)
-- Also adds increment_by parameter for batch updates

-- Drop old function if exists (with old name)
DROP FUNCTION IF EXISTS increment_generated_pins(UUID);

-- Create correct function with batch increment support
CREATE OR REPLACE FUNCTION increment_campaign_pins(
    campaign_uuid UUID,
    increment_by INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_pins INTEGER;
    v_new_generated INTEGER;
BEGIN
    -- Atomically increment and get the new values
    UPDATE campaigns
    SET 
        generated_pins = COALESCE(generated_pins, 0) + increment_by,
        updated_at = NOW()
    WHERE id = campaign_uuid
    RETURNING generated_pins, total_pins INTO v_new_generated, v_total_pins;
    
    -- Auto-complete if all pins generated
    IF v_new_generated >= v_total_pins AND v_total_pins > 0 THEN
        UPDATE campaigns
        SET 
            status = 'completed',
            completed_at = NOW()
        WHERE id = campaign_uuid AND status != 'completed';
    END IF;
END;
$$;

-- Grant execute permission to service_role (for server-side calls)
GRANT EXECUTE ON FUNCTION increment_campaign_pins(UUID, INTEGER) TO service_role;

-- Also grant to authenticated for any client-side needs
GRANT EXECUTE ON FUNCTION increment_campaign_pins(UUID, INTEGER) TO authenticated;

COMMENT ON FUNCTION increment_campaign_pins(UUID, INTEGER) IS 
    'Atomically increments generated_pins counter by a specified amount. Auto-completes campaign when done.';
