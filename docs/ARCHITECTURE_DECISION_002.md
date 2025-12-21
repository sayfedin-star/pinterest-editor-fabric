# ADR-002: Store Consolidation (Complete)

> **Date:** 2025-12-21  
> **Author:** AI Architect  
> **Status:** IMPLEMENTED  
> **Supersedes:** ADR-001 (Facade Pattern - Not Implemented)

---

## Context

ADR-001 proposed a Facade Pattern where `editorStore` would delegate to specialized stores (`elementsStore`, `selectionStore`, `canvasStore`, `layersStore`) while keeping them as the source of truth.

**This approach was NOT implemented.** Instead, a complete consolidation was performed.

---

## Decision

**Approach: True Consolidation**

1. **Delete all specialized stores** - Remove `elementsStore`, `selectionStore`, `canvasStore`, `layersStore`
2. **editorStore is the single source of truth** - All state lives in one store
3. **Migrate all components** - Update 15 files to import from `editorStore` only
4. **Remove delegation** - Functions operate directly on editorStore state

---

## Implementation Summary

### Files Deleted

- `src/stores/elementsStore.ts`
- `src/stores/selectionStore.ts`
- `src/stores/canvasStore.ts`
- `src/stores/layersStore.ts`
- `src/components/canvas/EditorCanvas.optimized.tsx`

### Files Migrated (15 total)

Components: `Toolbar`, `LayersList`, `CanvasSizeSection`, `ZoomControls`, `ContextMenu`, `EditorCanvas`, `Header`, `PositionPanel`, `LayersPanel`, `ImagePropertiesSection`, `TextPropertiesSection`

Hooks: `useAutoSave`, `useTemplateFromUrl`, `useSynchronizationBridge`

Lib: `CanvasManager`

### editorStore Changes

Before (delegation):

```typescript
addElement: (element) => {
  useElementsStore.getState().addElement(element);
  set({ elements: useElementsStore.getState().elements });
};
```

After (direct):

```typescript
addElement: (element) => {
  set((state) => ({
    elements: [...state.elements, element],
    selectedIds: [element.id],
  }));
};
```

---

## Rationale for Change from ADR-001

| ADR-001 (Facade)          | ADR-002 (Consolidation)              |
| ------------------------- | ------------------------------------ |
| Low effort (4h)           | Medium effort (completed in session) |
| Keep specialized stores   | Delete specialized stores            |
| Delegation pattern        | Direct state ownership               |
| Complex sync layer        | Simpler architecture                 |
| Multiple sources of truth | Single source of truth               |

**Why consolidation was chosen:**

1. Facade still leaves sync bugs possible
2. True single source of truth eliminates sync complexity
3. Smaller bundle size (removed ~20KB)
4. Simpler debugging and maintenance

---

## Verification

- ✅ Editor tested and working
- ✅ Add/select/move elements works
- ✅ Undo/redo works
- ✅ Zoom works
- ✅ No build errors

---

## Remaining Stores

| Store                   | Purpose                     | Status          |
| ----------------------- | --------------------------- | --------------- |
| `editorStore`           | Primary editor state        | ✅ Consolidated |
| `alignmentStore`        | Element alignment utilities | Keep            |
| `templateStore`         | Template gallery            | Keep            |
| `categoryStore`         | Category CRUD               | Keep            |
| `tagStore`              | Tag CRUD                    | Keep            |
| `templateMetadataStore` | Template metadata           | Keep            |
| `snappingSettingsStore` | Snapping config             | Keep            |
| `toastStore`            | Notifications               | Keep            |
| `generationStore`       | Bulk generation             | Keep            |

---

## Future Considerations

1. **Consider slicing editorStore** - At ~1100 lines, could split by domain while keeping single store
2. **Update editorStore tests** - Test file needs updating for new API
3. **Remove test files** - Old store test files should be deleted
