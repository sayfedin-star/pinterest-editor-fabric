# Store Consolidation Implementation Plan

**Feature:** Option A - Consolidate to Single editorStore  
**Date:** 2025-12-21  
**Effort Estimate:** ~4 hours

---

## Success Criteria

- [ ] All specialized store imports replaced with editorStore
- [ ] No runtime errors on dev server
- [ ] Editor functionality works: add/edit/delete elements, selection, zoom, layers
- [ ] Sync bridge reduced to 2 directions (Canvas ↔ editorStore)
- [ ] 4 store files deleted

---

## Phase 1: Update useSynchronizationBridge (CRITICAL)

**Risk:** High - This is the heart of state sync

### Changes

- [ ] Remove imports for `useElementsStore`, `useSelectionStore`
- [ ] Update `handleElementsChanged` to use `useEditorStore.getState().updateElement()`
- [ ] Update `handleSelectionChanged` to use `useEditorStore.setState()`
- [ ] Remove unused sync directions (should go from 5 → 2)

### Files

| File                                    | Action   |
| --------------------------------------- | -------- |
| `src/hooks/useSynchronizationBridge.ts` | Refactor |

---

## Phase 2: Update Component Imports

**Risk:** Low - Find/replace with verification

### Files to Update

| File                                          | Remove Import                           | Add Import                 |
| --------------------------------------------- | --------------------------------------- | -------------------------- |
| `src/components/layout/Toolbar.tsx`           | `useSelectionStore`                     | `useEditorStore` selectors |
| `src/components/panels/LayersList.tsx`        | `useSelectionStore`, `useElementsStore` | `useEditorStore` selectors |
| `src/components/panels/CanvasSizeSection.tsx` | `useCanvasStore`                        | `useEditorStore` selectors |
| `src/components/panels/BackgroundSection.tsx` | `useCanvasStore`                        | `useEditorStore` selectors |
| `src/hooks/useAutoSave.ts`                    | `useCanvasStore`                        | `useEditorStore` selectors |
| `src/hooks/useTemplateFromUrl.ts`             | `useCanvasStore`                        | `useEditorStore` selectors |

---

## Phase 3: Update stores/index.ts and Delete Stores

**Risk:** Medium - Breaking change

### Changes

- [ ] Remove exports for deleted stores
- [ ] Remove type exports for deleted stores
- [ ] Delete store files

### Files to DELETE

```
src/stores/elementsStore.ts
src/stores/selectionStore.ts
src/stores/canvasStore.ts
src/stores/layersStore.ts
```

### Tests to DELETE

```
src/stores/__tests__/elementsStore.test.ts
src/stores/__tests__/selectionStore.test.ts
src/stores/__tests__/canvasStore.test.ts
src/stores/__tests__/layersStore.test.ts
```

---

## Phase 4: Clean up editorStore

**Risk:** Low

### Changes

- [ ] Remove imports for deleted stores
- [ ] Inline any delegated logic (currently delegates to specialized stores)
- [ ] Update comments to reflect new architecture

---

## Verification Plan

### Automated Tests

```powershell
# Run existing editorStore tests (should pass)
npm test -- --testPathPattern=editorStore.test.ts
```

### Manual Verification (required)

1. **Start dev server:** `npm run dev`
2. **Test element operations:**
   - Add text element → should appear on canvas
   - Move element → should update position
   - Delete element → should remove from canvas
3. **Test selection:**
   - Click element → should show selection handles
   - Click empty area → should deselect
   - Shift+click → should multi-select
4. **Test canvas settings:**
   - Change background color → should update
   - Change canvas size → should resize
   - Zoom in/out → should work
5. **Test layer ordering:**
   - Drag layers in panel → should reorder on canvas
   - Use layer order buttons → should work

### Smoke Test Checklist

- [ ] Dev server starts without errors
- [ ] No console errors in browser
- [ ] Can add text/image/shape
- [ ] Can select and move elements
- [ ] Undo/redo works
- [ ] Save/load template works
- [ ] Layers panel shows elements

---

## Alternatives Considered

1. **Option B: Migrate fully to specialized stores**
   - Rejected: ~12+ hours effort, higher risk, same outcome
2. **Keep both (status quo)**
   - Rejected: Perpetuates complexity, worse long-term

---

## Rollback Plan

If issues arise:

1. `git checkout HEAD -- src/stores/` to restore all store files
2. `git checkout HEAD -- src/hooks/useSynchronizationBridge.ts`
3. `git checkout HEAD -- src/components/` to restore component imports
