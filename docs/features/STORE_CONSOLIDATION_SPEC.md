# Store Consolidation - Deep Discovery Report

**Date:** 2025-12-21  
**Status:** REVISED Investigation Complete

---

## Answers to Developer Questions

### Q1: Does `useSynchronizationBridge.ts` exist?

✅ **YES** - Located at `src/hooks/useSynchronizationBridge.ts` (150 lines)

- Imports: `useElementsStore`, `useSelectionStore`, `useEditorStore`
- Manages 5 sync directions as originally stated

### Q2: Current test coverage?

Found test files for:

- `editorStore.test.ts` ✅
- `elementsStore.test.ts` - TO BE DELETED
- `selectionStore.test.ts` - TO BE DELETED
- `canvasStore.test.ts` - TO BE DELETED
- `layersStore.test.ts` - TO BE DELETED

### Q3: Why were specialized stores created?

From `stores/index.ts` comment (Line 6-10):

> "Architecture Decision (2025-12-15):
>
> - editorStore serves as FACADE over specialized stores
> - Specialized stores are the SOURCE OF TRUTH
> - editorStore delegates to specialized stores internally"

**Reality:** This was never fully executed - editorStore still maintains its own state AND delegates.

### Q4: Dynamic imports for stores?

✅ **YES** - Found in `editorStore.ts`:

- Line 654: `const canvasStore = require('./canvasStore').useCanvasStore.getState();`
- Line 679: `const canvasStore = require('./canvasStore').useCanvasStore.getState();`
- Line 755: `const { useTemplateStore } = require('./templateStore');`

**Reason:** Likely to avoid circular dependency issues during undo/redo.

### Q5: Realistic timeline with 17+ methods?

**Revised Estimate:** 6-8 hours (not 4)

- Phase 1: Sync bridge (1.5h)
- Phase 2: Component imports - 18 files (2h)
- Phase 3: Store deletion (0.5h)
- Phase 4: editorStore cleanup - 48 cross-store calls (2-3h)
- Verification (1h)

### Q6: Rollback strategy?

**ADDED** - See revised implementation plan below.

### Q7: History system migration?

**No change needed** - History is stored in editorStore.history, not specialized stores.
The HistorySnapshot interface uses editorStore's own state:

```typescript
interface HistorySnapshot {
  elements: Element[]; // editorStore.elements
  canvasSize: CanvasSize; // editorStore.canvasSize
  backgroundColor: string; // editorStore.backgroundColor
}
```

### Q8: All files importing specialized stores?

✅ **COMPLETE LIST** (28 files total):

**Production Files to Modify (18):**
| File | Imports |
|------|---------|
| `hooks/useSynchronizationBridge.ts` | elementsStore, selectionStore |
| `hooks/useAutoSave.ts` | canvasStore |
| `hooks/useTemplateFromUrl.ts` | canvasStore |
| `components/layout/Toolbar.tsx` | selectionStore |
| `components/layout/Header.tsx` | selectionStore/elementsStore |
| `components/panels/LayersList.tsx` | selectionStore, elementsStore |
| `components/panels/LayersPanel.tsx` | selectionStore/elementsStore |
| `components/panels/CanvasSizeSection.tsx` | canvasStore |
| `components/panels/PositionPanel.tsx` | elementsStore |
| `components/panels/properties/TextPropertiesSection.tsx` | selectionStore |
| `components/panels/properties/ImagePropertiesSection.tsx` | selectionStore |
| `components/canvas/EditorCanvas.tsx` | elementsStore/selectionStore |
| `components/canvas/EditorCanvas.optimized.tsx` | elementsStore/selectionStore |
| `components/canvas/ContextMenu.tsx` | selectionStore |
| `components/canvas/ZoomControls.tsx` | canvasStore |
| `lib/canvas/CanvasManager.ts` | (uses callbacks, not direct store) |
| `stores/editorStore.ts` | All 3 stores (48 calls) |
| `stores/elementsStore.ts` | selectionStore |

**Store Files to Delete (4):**

- `stores/elementsStore.ts`
- `stores/selectionStore.ts`
- `stores/canvasStore.ts`
- `stores/layersStore.ts`

**Test Files to Delete (4):**

- `stores/__tests__/elementsStore.test.ts`
- `stores/__tests__/selectionStore.test.ts`
- `stores/__tests__/canvasStore.test.ts`
- `stores/__tests__/layersStore.test.ts`

---

## Cross-Store Calls in editorStore.ts (48 total)

| Line    | Method              | Store Called                               | Action                  |
| ------- | ------------------- | ------------------------------------------ | ----------------------- |
| 197     | addElement          | elementsStore                              | addElement()            |
| 198     | addElement          | selectionStore                             | selectElement()         |
| 201     | addElement          | elementsStore                              | .elements               |
| 210     | updateElement       | elementsStore                              | updateElement()         |
| 213     | updateElement       | elementsStore                              | .elements               |
| 218     | deleteElement       | elementsStore                              | deleteElement()         |
| 222-223 | deleteElement       | elementsStore, selectionStore              | .elements, .selectedIds |
| 270     | selectElement       | selectionStore                             | selectElement()         |
| 272     | selectElement       | selectionStore                             | clearSelection()        |
| 275     | selectElement       | selectionStore                             | .selectedIds            |
| 280     | toggleSelection     | selectionStore                             | toggleSelection()       |
| 282     | toggleSelection     | selectionStore                             | .selectedIds            |
| 287     | lockElement         | elementsStore                              | lockElement()           |
| 289     | lockElement         | elementsStore                              | .elements               |
| 386     | moveElementForward  | elementsStore                              | .elements               |
| 401     | moveElementForward  | elementsStore                              | setElements()           |
| 407     | moveElementBackward | elementsStore                              | .elements               |
| 419     | moveElementBackward | elementsStore                              | setElements()           |
| 425     | moveElementToFront  | elementsStore                              | .elements               |
| 435     | moveElementToFront  | elementsStore                              | setElements()           |
| 441     | moveElementToBack   | elementsStore                              | .elements               |
| 455     | moveElementToBack   | elementsStore                              | setElements()           |
| 462     | alignElement        | elementsStore                              | .elements               |
| 495     | alignElement        | elementsStore                              | setElements()           |
| 652-654 | undo                | elementsStore, selectionStore, canvasStore | sync all                |
| 677-679 | redo                | elementsStore, selectionStore, canvasStore | sync all                |
| 693     | setBackgroundColor  | canvasStore                                | setBackgroundColor()    |
| 700-702 | setCanvasSize       | canvasStore                                | setCanvasSize()         |
| 707     | setElements         | elementsStore                              | setElements()           |
| 719-726 | loadTemplate        | all 3 stores                               | sync all                |
| 749-752 | resetToNewTemplate  | all 3 stores                               | clear all               |
| 818     | addCanvaBackground  | elementsStore                              | setElements()           |

---

## Revised Implementation Plan

### Pre-Implementation: Git Safety

```powershell
# Create restore point BEFORE any changes
git add -A
git commit -m "chore: pre-consolidation checkpoint"
git tag pre-store-consolidation
```

### Phase 1: editorStore Cleanup (CRITICAL)

**Goal:** Remove all 48 cross-store calls, inline the logic

**Strategy:** Since editorStore already has all state properties, REMOVE the delegation pattern:

```typescript
// BEFORE (current pattern - delegates to specialized store)
addElement: (element) => {
  useElementsStore.getState().addElement(element); // DELETE
  useSelectionStore.getState().selectElement(element.id); // DELETE
  const elements = useElementsStore.getState().elements; // DELETE
  set({
    elements: elements, // CHANGE TO: [...state.elements, element]
    selectedIds: [element.id],
  });
};

// AFTER (self-contained)
addElement: (element) => {
  set((state) => ({
    elements: [...state.elements, element],
    selectedIds: [element.id],
  }));
};
```

**Files Modified:** 1 (`editorStore.ts`)
**Verification:** `npm run dev` - check element operations work

### Phase 2: useSynchronizationBridge Simplification

**Goal:** Remove specialized store dependencies

**Changes:**

- Remove imports for `useElementsStore`, `useSelectionStore`
- Update `handleElementsChanged` to use `useEditorStore.getState().updateElement()`
- Update `handleSelectionChanged` to use `useEditorStore.setState()`
- Direction 5 (zIndex sync) subscribes to `useEditorStore` instead

**Files Modified:** 1 (`useSynchronizationBridge.ts`)
**Verification:** Canvas drag/selection still syncs

### Phase 3: Component Import Migration

**Goal:** Replace specialized store imports with editorStore

**18 files** - each follows pattern:

```typescript
// BEFORE
import { useSelectionStore } from "@/stores/selectionStore";
const selectedIds = useSelectionStore((s) => s.selectedIds);

// AFTER
import { useEditorStore } from "@/stores/editorStore";
const selectedIds = useEditorStore((s) => s.selectedIds);
```

**Verification:** Each component renders correctly

### Phase 4: Store Deletion

**Only after Phases 1-3 verified**

1. Update `stores/index.ts` - remove exports
2. Delete store files (4)
3. Delete test files (4)

**Verification:** `npm run dev` - no import errors

### Phase 5: Documentation

- Create ADR-002
- Update ARCHITECTURE.md
- Update PROGRESS.md

---

## Rollback Strategy

### Per-Phase Rollback

```powershell
# If Phase 1 fails:
git checkout HEAD -- src/stores/editorStore.ts

# If Phase 2 fails:
git checkout HEAD -- src/hooks/useSynchronizationBridge.ts

# If Phase 3 fails:
git checkout HEAD -- src/components/ src/hooks/

# Full rollback (any phase):
git reset --hard pre-store-consolidation
```

### Checkpoint Commands

After each successful phase:

```powershell
git add -A
git commit -m "refactor: Phase X complete - [description]"
```

---

## Success Criteria (Revised)

### Phase 1 Success

- [ ] `npm run dev` starts without errors
- [ ] Can add/edit/delete elements
- [ ] No console errors about missing stores

### Phase 2 Success

- [ ] Canvas drag updates element positions
- [ ] Click selection works
- [ ] Layer reordering works

### Phase 3 Success

- [ ] All migrated components render
- [ ] No TypeScript errors
- [ ] Toolbar, panels, canvas all functional

### Phase 4 Success

- [ ] No import errors after store deletion
- [ ] All e2e smoke tests pass
- [ ] 8 fewer files in repository

---

## Risk Mitigation Table (Revised)

| Risk                              | Likelihood | Impact | Mitigation                          |
| --------------------------------- | ---------- | ------ | ----------------------------------- |
| Breaking element operations       | Medium     | High   | Phase 1 tested in isolation         |
| Breaking canvas sync              | Medium     | High   | Phase 2 tested separately           |
| Missing component import          | Low        | Low    | TypeScript catches                  |
| State corruption during undo/redo | Medium     | High   | Special attention to lines 652-682  |
| Dynamic require() breaking        | Low        | Medium | Dynamic imports converted to static |
| Circular dependencies             | Low        | Medium | Import order carefully managed      |

---

## Timeline (Revised)

| Phase                | Estimated Time | Cumulative   |
| -------------------- | -------------- | ------------ |
| Git safety + Phase 1 | 2.5 hours      | 2.5h         |
| Phase 2              | 1 hour         | 3.5h         |
| Phase 3              | 2 hours        | 5.5h         |
| Phase 4              | 0.5 hours      | 6h           |
| Phase 5 (docs)       | 1 hour         | 7h           |
| Buffer               | 1 hour         | **8h total** |
