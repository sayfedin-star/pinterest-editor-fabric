/**
 * Feature Flags Configuration
 * 
 * Controls which experimental features are enabled in the application.
 */

/**
 * Use the new CanvasManager-based EditorCanvas instead of the legacy Fabric.js implementation
 * 
 * When true: Uses EditorCanvas.v2.tsx (CanvasManager architecture)
 * When false: Uses EditorCanvas.tsx (direct Fabric.js access)
 * 
 * Default: true (testing smart element sync fix - Week 4 Phase 1)
 * 
 * Week 4 Fix: Smart element change detection now prevents drag interruptions
 */
export const USE_NEW_CANVAS = true;

/**
 * Enable performance monitoring overlay
 */
export const SHOW_PERFORMANCE_METRICS = false;

/**
 * Enable debug logging for CanvasManager
 */
export const DEBUG_CANVAS_MANAGER = false;
