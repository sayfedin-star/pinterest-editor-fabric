# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed

- **Template Name Persistence Bug** - Editor no longer remembers template name from previous session when opening fresh. New templates now always start with "Untitled Template".

- **Duplicate Template Overwrite** - Fixed issue where saving a new template with a name matching an existing template would silently overwrite the existing template.
  - Manual save now shows error and requires unique name
  - Auto-save skips entirely when name conflict detected (prevents accidental overwrites)
- **"New" Button Not Resetting Name** - Clicking "New Template" button now properly resets both `editorStore` and `templateStore`, ensuring the name field shows "Untitled Template".

- **Canvas Clearing After Save** - Fixed bug where canvas elements would disappear after saving a template. The issue was caused by calling `loadTemplate()` after save, which would reset elements to empty array if DB response didn't include them.

### Changed

- **Auto-save Status Indicator** - Added new `'conflict'` status type that shows "Name exists - rename to save" when auto-save is blocked due to name conflict.

### Technical Details

**Files Modified:**

- `templateStore.ts` - Added custom `partialize` and `merge` functions to handle new template persistence correctly
- `editorStore.ts` - Updated `resetToNewTemplate()` to also reset `templateStore`
- `useAutoSave.ts` - Skip save when duplicate name detected (instead of updating existing)
- `Header.tsx` - Changed duplicate name warning to error requiring unique name
- `AutoSaveIndicator.tsx` - Added UI for new `'conflict'` status
- `templates.ts` - Added `checkTemplateNameExists()` function for duplicate detection

---

## [Previous Changes]

See git history for older changes.
