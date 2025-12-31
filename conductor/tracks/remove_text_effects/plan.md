# Track Plan: Remove Advanced Text Effects

## Goal
Remove "Hollow Text", "Shadow", "Outline", and "Text Background" features from the codebase to simplify the editor and reduce maintenance burden.

## Scope
- **Hollow Text:** Remove `hollowEnabled`, `hollowPower` (and related `hollowText` boolean).
- **Shadow:** Remove `shadowEnabled`, `shadowX`, `shadowY`, `shadowBlur`, `shadowColor`, `shadowOpacity`.
- **Outline:** Remove `outlineEnabled`, `outlineWidth`, `outlineColor` (and related `stroke`, `strokeWidth`).
- **Text Background:** Remove `textBackgroundEnabled`, `textBackgroundColor`.

## Steps

### Phase 1: Types & Interfaces
- [x] Remove properties from `src/types/editor.ts`.
- [x] Verify `src/types/database.types.ts` (if applicable).

### Phase 2: UI Components
- [x] Remove `EffectsSection.tsx` usage and file.
- [x] Remove Hollow Text toggle from `TypographySection.tsx`.
- [x] Update `FontLibraryPanel.tsx` to remove shadow presets.
- [x] Remove `textBackgroundColor` controls if present (check `TypographySection` or `EffectsSection`).

### Phase 3: State Management
- [x] Update `src/stores/editorStore.ts` to remove these properties from state and actions.
- [x] Update `src/lib/canvas/elementChangeDetection.ts`.

### Phase 4: Rendering Logic
- [x] Update `src/lib/fabric/serverEngine.ts` (remove Shadow, Stroke, Background logic).
- [x] Update `src/lib/canvas/ObjectFactory.ts` (remove Shadow, Stroke, Background logic).
- [x] Update `src/lib/canvas/AutoFitText.ts`.

### Phase 5: Tests
- [x] Update/Remove tests in `src/lib/fabric/__tests__/rendering-parity.test.ts` (Deleted).
- [x] Update/Remove tests in `src/lib/fabric/__tests__/engine.test.ts`.
- [x] Update/Remove tests in `src/lib/canvas/__tests__/object-factory.test.ts`.

## Verification
- [x] Run `npm run type-check` to ensure no type errors.
- [x] Run `npm run test` to ensure no regressions.