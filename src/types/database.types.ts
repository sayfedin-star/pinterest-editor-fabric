// Database types for Supabase tables
// These types match the schema defined in supabase/migrations/

import { Element, CanvasSize } from "./editor";

// ============================================
// Categories
// ============================================
export interface DbCategory {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  template_count: number;
  created_at: string;
  updated_at: string;
}

export interface DbCategoryInsert {
  id?: string;
  user_id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  template_count?: number;
}

export interface DbCategoryUpdate {
  name?: string;
  slug?: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  template_count?: number;
}

// ============================================
// Tags
// ============================================
export interface DbTag {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  template_count: number;
  created_at: string;
  updated_at: string;
}

export interface DbTagInsert {
  id?: string;
  user_id: string;
  name: string;
  slug: string;
  description?: string | null;
  template_count?: number;
}

export interface DbTagUpdate {
  name?: string;
  slug?: string;
  description?: string | null;
  template_count?: number;
}

// ============================================
// Template Tags (Junction Table)
// ============================================
export interface DbTemplateTag {
  template_id: string;
  tag_id: string;
  created_at: string;
}

export interface DbTemplateTagInsert {
  template_id: string;
  tag_id: string;
}

// ============================================
// Templates
// ============================================
export interface DbTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  canvas_size: CanvasSize;
  background_color: string;
  elements: Element[];
  thumbnail_url: string | null;
  category: string | null; // Legacy field (string)
  category_id: string | null; // NEW: Foreign key to categories
  is_public: boolean;
  is_featured: boolean; // NEW: For highlighting best templates
  view_count: number; // NEW: Track popularity
  like_count: number; // NEW: Track user favorites
  created_at: string;
  updated_at: string;
  // Virtual/joined fields (from queries with joins)
  category_data?: DbCategory | null;
  tags?: DbTag[];
  short_id: string | null; // NEW: User-friendly ID
}

export interface DbTemplateInsert {
  id?: string;
  user_id: string;
  name: string;
  description?: string | null;
  canvas_size: CanvasSize;
  background_color?: string;
  elements: Element[];
  thumbnail_url?: string | null;
  category?: string | null;
  category_id?: string | null;
  is_public?: boolean;
  is_featured?: boolean;
  short_id?: string;
}

export interface DbTemplateUpdate {
  name?: string;
  description?: string | null;
  canvas_size?: CanvasSize;
  background_color?: string;
  elements?: Element[];
  thumbnail_url?: string | null;
  category?: string | null;
  category_id?: string | null;
  is_public?: boolean;
  is_featured?: boolean;
  view_count?: number;
  like_count?: number;
  short_id?: string;
}

// ============================================
// API Keys
// ============================================
export interface DbApiKey {
  id: string;
  user_id: string;
  key_hash: string;
  key_prefix: string;
  name: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

export interface DbApiKeyInsert {
  id?: string;
  user_id: string;
  key_hash: string;
  key_prefix: string;
  name?: string;
  is_active?: boolean;
  created_at?: string;
  last_used_at?: string | null;
}

export interface DbApiKeyUpdate {
  name?: string;
  is_active?: boolean;
  last_used_at?: string | null;
}

// ============================================
// Campaigns
// ============================================
export type CampaignStatus =
  | "pending"
  | "processing"
  | "paused"
  | "completed"
  | "failed";

// Distribution modes for multi-template campaigns
export type DistributionMode = "sequential" | "random" | "equal" | "csv_column";

export interface FieldMapping {
  [templateField: string]: string; // Maps template dynamic field to CSV column name
}

// Snapshot of template data preserved at campaign creation time
export interface TemplateSnapshot {
  id: string;
  short_id: string;
  name: string;
  elements: Element[];
  canvas_size: CanvasSize;
  background_color: string;
}

// Statistics tracking for campaign generation
export interface CampaignStatistics {
  template_distribution: Record<string, number>; // template_id -> count
  generation_times?: number[]; // ms per pin
  warnings?: string[]; // e.g., "Row 45: Template not found, using fallback"
}

export interface DbCampaign {
  id: string;
  user_id: string;
  template_id: string; // Keep for backward compatibility
  template_ids: string[] | null; // NEW: Array of template UUIDs (1-10)
  distribution_mode: DistributionMode; // NEW: How templates are assigned
  template_snapshot: TemplateSnapshot[] | null; // NEW: Preserved template data
  statistics: CampaignStatistics | null; // NEW: Generation stats
  name: string;
  csv_data: Record<string, unknown>[];
  field_mapping: FieldMapping;
  total_pins: number;
  generated_pins: number;
  status: CampaignStatus;
  output_folder_url: string | null;
  pinterest_board_id: string | null;
  auto_post: boolean;
  schedule_time: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface DbCampaignInsert {
  id?: string;
  user_id: string;
  template_id?: string; // Optional for backward compat
  template_ids?: string[]; // NEW: Array of template IDs
  distribution_mode?: DistributionMode; // NEW
  template_snapshot?: TemplateSnapshot[]; // NEW
  statistics?: CampaignStatistics; // NEW
  name: string;
  csv_data: Record<string, unknown>[];
  field_mapping: FieldMapping;
  total_pins: number;
  generated_pins?: number;
  status?: CampaignStatus;
  output_folder_url?: string | null;
  pinterest_board_id?: string | null;
  auto_post?: boolean;
  schedule_time?: string | null;
}

export interface DbCampaignUpdate {
  name?: string;
  template_ids?: string[]; // NEW
  distribution_mode?: DistributionMode; // NEW
  template_snapshot?: TemplateSnapshot[]; // NEW
  statistics?: CampaignStatistics; // NEW
  csv_data?: Record<string, unknown>[];
  field_mapping?: FieldMapping;
  total_pins?: number;
  generated_pins?: number;
  status?: CampaignStatus;
  output_folder_url?: string | null;
  pinterest_board_id?: string | null;
  auto_post?: boolean;
  schedule_time?: string | null;
  completed_at?: string | null;
}

// ============================================
// Generated Pins
// ============================================
export type PinStatus = "generated" | "posted" | "failed";

export interface DbGeneratedPin {
  id: string;
  campaign_id: string;
  user_id: string;
  data_row: Record<string, unknown>;
  image_url: string;
  pinterest_pin_id: string | null;
  posted_at: string | null;
  status: PinStatus;
  error_message: string | null;
  created_at: string;
}

export interface DbGeneratedPinInsert {
  id?: string;
  campaign_id: string;
  user_id: string;
  data_row: Record<string, unknown>;
  image_url: string;
  pinterest_pin_id?: string | null;
  posted_at?: string | null;
  status?: PinStatus;
  error_message?: string | null;
}

// ============================================
// User Preferences
// ============================================
export interface DbUserPreferences {
  user_id: string;
  pinterest_access_token: string | null;
  pinterest_refresh_token: string | null;
  pinterest_token_expires_at: string | null;
  default_pinterest_board_id: string | null;
  auto_post_enabled: boolean;
  tebi_folder_prefix: string | null;
  notification_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbUserPreferencesInsert {
  user_id: string;
  pinterest_access_token?: string | null;
  pinterest_refresh_token?: string | null;
  pinterest_token_expires_at?: string | null;
  default_pinterest_board_id?: string | null;
  auto_post_enabled?: boolean;
  tebi_folder_prefix?: string | null;
  notification_email?: string | null;
}

export interface DbUserPreferencesUpdate {
  pinterest_access_token?: string | null;
  pinterest_refresh_token?: string | null;
  pinterest_token_expires_at?: string | null;
  default_pinterest_board_id?: string | null;
  auto_post_enabled?: boolean;
  tebi_folder_prefix?: string | null;
  notification_email?: string | null;
}

// ============================================
// Usage Stats
// ============================================
export type UsageActionType =
  | "template_created"
  | "template_updated"
  | "template_deleted"
  | "pin_generated"
  | "pin_posted"
  | "campaign_created";

export interface DbUsageStats {
  id: string;
  user_id: string;
  action_type: UsageActionType;
  count: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface DbUsageStatsInsert {
  id?: string;
  user_id: string;
  action_type: UsageActionType;
  count?: number;
  metadata?: Record<string, unknown> | null;
}

// ============================================
// Fonts
// ============================================
export interface DbFont {
  id: string;
  user_id: string;
  family: string;
  file_url: string;
  format: "ttf" | "otf" | "woff" | "woff2";
  category:
    | "sans-serif"
    | "serif"
    | "display"
    | "script"
    | "handwriting"
    | "monospace";
  file_size: number | null;
  created_at: string;
  updated_at: string;
}

export interface DbFontInsert {
  id?: string;
  user_id: string;
  family: string;
  file_url: string;
  format: DbFont["format"];
  category: DbFont["category"];
  file_size?: number | null;
}

export interface DbFontUpdate {
  family?: string;
  category?: DbFont["category"];
}

// ============================================
// Database Schema Definition (for typed Supabase client)
// ============================================
export interface Database {
  public: {
    Tables: {
      templates: {
        Row: DbTemplate;
        Insert: DbTemplateInsert;
        Update: DbTemplateUpdate;
      };
      categories: {
        Row: DbCategory;
        Insert: DbCategoryInsert;
        Update: DbCategoryUpdate;
      };
      tags: {
        Row: DbTag;
        Insert: DbTagInsert;
        Update: DbTagUpdate;
      };
      template_tags: {
        Row: DbTemplateTag;
        Insert: DbTemplateTagInsert;
        Update: never;
      };
      campaigns: {
        Row: DbCampaign;
        Insert: DbCampaignInsert;
        Update: DbCampaignUpdate;
      };
      generated_pins: {
        Row: DbGeneratedPin;
        Insert: DbGeneratedPinInsert;
        Update: Partial<DbGeneratedPin>;
      };
      user_preferences: {
        Row: DbUserPreferences;
        Insert: DbUserPreferencesInsert;
        Update: DbUserPreferencesUpdate;
      };
      usage_stats: {
        Row: DbUsageStats;
        Insert: DbUsageStatsInsert;
        Update: never;
      };
      custom_fonts: {
        Row: DbFont;
        Insert: DbFontInsert;
        Update: DbFontUpdate;
      };
      api_keys: {
        Row: DbApiKey;
        Insert: DbApiKeyInsert;
        Update: DbApiKeyUpdate;
      };
    };
  };
}
