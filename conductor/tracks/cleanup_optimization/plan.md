# Track Plan: Code Cleanup & Optimization

## Goal
Remove dead code, consolidate duplicates, and simplify logic following the removal of text effects features.

## Scope
1. **Consolidation:** Merge duplicate `CanvasPool` implementations.
2. **Cleanup:** Remove redundant logic in `ObjectFactory.ts` (Group handling), `serverEngine.ts` (imports), and `AutoFitText.ts` (Shadow refs).
3. **Refactoring:** Extract complex imperative logic from `editorStore.ts` into pure utility functions.

## Steps

### Phase 1: Consolidation
- [x] Analyze `src/lib/fabric/CanvasPool.ts` and `src/lib/canvas/CanvasPool.ts` to determine the best single implementation.
- [x] Move the consolidated `CanvasPool` to a shared location (e.g., `src/lib/utils/canvasPool.ts` or keep one and delete the other).
- [x] Update all imports to point to the consolidated file.

### Phase 2: Logic Cleanup
- [x] **ObjectFactory.ts**: Remove `fabric.Group` handling logic in `syncElementToFabric` and `syncFabricToElement` (since text backgrounds are gone, text objects are just Textboxes now).
- [x] **serverEngine.ts**: Remove unused `Shadow`, `Group` imports and any lingering usage.
- [x] **AutoFitText.ts**: Remove `ShadowClass` usage.

### Phase 3: Store Refactoring
- [x] Create `src/lib/utils/elementOperations.ts`.
- [x] Extract `reorderElements` logic from `editorStore.ts`.
- [x] Extract `duplicateElement` logic from `editorStore.ts`.
- [x] Update `editorStore.ts` to use these new utilities.

## Verification
- [x] Run `npm run type-check`.
- [x] Run `npm run test` (especially `engine.test.ts` and `object-factory.test.ts`).
