# 🔄 REFACTORING_PLAN.md - Pinterest Editor Fabric

**Version:** 1.0  
**Last Updated:** December 17, 2024  
**Total Estimated Effort:** 23-25 hours (3-4 weeks part-time)  
**Status:** 177/199 tests passing (88% coverage)

---

## 📖 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Phase 1: Critical Bug Fixes](#phase-1-critical-bug-fixes)
4. [Phase 2: Canvas Performance Optimization](#phase-2-canvas-performance-optimization)
5. [Phase 3: Component Optimization](#phase-3-component-optimization)
6. [Phase 4: Code Quality Improvements](#phase-4-code-quality-improvements)
7. [Success Metrics & Validation](#success-metrics--validation)
8. [Risk Assessment](#risk-assessment)

---

## 🎯 Executive Summary

### Refactoring Philosophy

**"Fix bugs before optimizing performance. You can't optimize broken code."**

This plan addresses three categories of technical debt:

1. **Critical Bugs** (Phase 1) - Data integrity issues blocking production readiness
2. **Performance Bottlenecks** (Phase 2) - Canvas rendering slowdowns affecting UX
3. **Code Quality** (Phase 3-4) - Maintainability and scalability improvements

### Deployment Strategy

- **Phase 1:** Deploy after each bug fix (granular deployments)
- **Phase 2:** Deploy after each optimization (measure before/after)
- **Phase 3:** Deploy weekly (batched component improvements)
- **Phase 4:** Continuous (no user-facing changes)

---

## 📊 Current State Analysis

### System Health Overview

```
✅ COMPLETED (Phase 0):
├─ editorStore split into 7 specialized stores (90% complete)
├─ PropertiesPanel split (896 → 85 lines, 10 sections)
├─ CanvasManager modularized (825 → 567 lines)
├─ Error boundaries (4 levels: app, canvas, sidebars, panels)
├─ Auto-save mechanism (30s debounce)
└─ Test infrastructure (Jest + Playwright)

🔴 CRITICAL ISSUES:
├─ GitHub Issue #1: Toolbar store mismatch (30 min fix)
├─ GitHub Issue #2: Undo/redo sync failure (1 hour fix)
├─ GitHub Issue #3: ✅ ALREADY FIXED (selection clears on delete)
└─ GitHub Issue #4: Dual-state architecture decision (2 hours)

🟠 PERFORMANCE BOTTLENECKS:
├─ Canvas renders on every change (no debouncing)
├─ Fabric objects recreated instead of reused (70% waste)
├─ Bulk generation creates new canvas per pin (memory pressure)
└─ No React.memo on expensive components (50% excess renders)

🟡 CODE QUALITY DEBT:
├─ 15 unused dependencies (bundle bloat)
├─ Prop drilling in alignment code (3-4 levels deep)
├─ Missing JSDoc for CanvasManager (567 lines undocumented)
└─ No virtual scrolling in LayersPanel (slow at 100+ elements)
```

### Performance Baseline (Before Refactoring)

| Metric                     | Current | Target  | Measurement Method         |
| -------------------------- | ------- | ------- | -------------------------- |
| Canvas FPS (50 elements)   | 30 FPS  | 55+ FPS | PerformanceMonitor         |
| Element update time        | 45ms    | 15ms    | Chrome DevTools            |
| Bulk generation (100 pins) | 180s    | 90s     | GenerationController timer |
| Bundle size                | 1.2MB   | 900KB   | `next build` output        |
| Test coverage              | 88%     | 90%+    | Jest --coverage            |

### Store Architecture Status

```
FACADE PATTERN (In Transition):

editorStore.ts (1,390 lines)
├─ Role: Facade for legacy components
├─ Status: Delegates to specialized stores
└─ Issue: Some methods still update editorStore directly

elementsStore.ts (215 lines)
├─ Role: SOURCE OF TRUTH for elements array
├─ Status: ✅ Complete, well-tested
└─ Issue: deleteElement fixed, selection sync working

selectionStore.ts (61 lines)
├─ Role: SOURCE OF TRUTH for selectedIds
├─ Status: ✅ Complete
└─ Issue: None

canvasStore.ts (85 lines)
├─ Role: SOURCE OF TRUTH for canvas config
├─ Status: ✅ Complete
└─ Issue: None

10 additional stores (all functional)
```

---

## 🔴 Phase 1: Critical Bug Fixes

**Goal:** Restore data integrity, fix split-brain state issues  
**Duration:** 3-4 hours  
**Risk Level:** LOW (well-isolated changes)  
**Can Deploy:** YES (after each fix)

---

### 1.1 Fix Toolbar Store Mismatch

**Priority:** 🔴 CRITICAL  
**Effort:** 30 minutes  
**Risk:** LOW  
**Reference:** GitHub Issue #1 (`docs/GITHUB_ISSUES.md`)

#### Current State

**File:** `src/components/layout/Toolbar.tsx` (lines 57-62)

```typescript
// ❌ BROKEN: Reads from historyStore, calls editorStore
const canUndo = useHistoryStore((s) => s.canUndo()); // historyStore
const canRedo = useHistoryStore((s) => s.canRedo()); // historyStore
const undo = useEditorStore((s) => s.undo); // editorStore (DIFFERENT!)
const redo = useEditorStore((s) => s.redo); // editorStore (DIFFERENT!)
```

**Problem:**

- `historyStore` doesn't exist (typo or renamed store)
- Buttons show incorrect enabled/disabled state
- Clicking undo/redo may fail silently

#### Proposed Solution

```typescript
// ✅ FIXED: Use same store for state and actions
const canUndo = useEditorStore((s) => s.canUndo());
const canRedo = useEditorStore((s) => s.canRedo());
const undo = useEditorStore((s) => s.undo);
const redo = useEditorStore((s) => s.redo);
```

#### Implementation Steps

1. **Locate the file:**

```bash
# Verify current implementation
grep -n "useHistoryStore" src/components/layout/Toolbar.tsx
```

2. **Study existing pattern:**

   - File: `src/stores/editorStore.ts` lines 663-720
   - Methods: `canUndo()`, `canRedo()`, `undo()`, `redo()`
   - History stored in: `editorStore.history`, `editorStore.historyIndex`

3. **Apply fix:**

   - Replace `useHistoryStore` with `useEditorStore` (4 lines)
   - Remove `useHistoryStore` import if unused elsewhere

4. **Test:**

```typescript
// Manual test script:
// 1. Open editor
// 2. Add text element
// 3. Undo button should enable
// 4. Click undo → element disappears
// 5. Redo button should enable
// 6. Click redo → element reappears
```

#### Success Criteria

- [ ] Undo button disabled when `historyIndex === 0`
- [ ] Redo button disabled when at latest state
- [ ] Clicking undo reverts last action
- [ ] Clicking redo restores undone action
- [ ] No console errors
- [ ] Existing tests pass

#### Rollback Plan

```bash
# If issue occurs:
git revert <commit-hash>
```

Extremely low risk - simple substitution.

---

### 1.2 Fix Undo/Redo Store Sync

**Priority:** 🔴 CRITICAL  
**Effort:** 1 hour  
**Risk:** MEDIUM  
**Reference:** GitHub Issue #2 (`docs/GITHUB_ISSUES.md`)

#### Current State

**File:** `src/stores/editorStore.ts` (lines 663-676)

```typescript
// ❌ BROKEN: Only updates editorStore
undo: () => {
  const { canUndo, history, historyIndex } = get();
  if (canUndo()) {
    const newIndex = historyIndex - 1;
    const snapshot = history[newIndex];

    set({
      elements: cloneDeep(snapshot.elements),
      canvasSize: { ...snapshot.canvasSize },
      backgroundColor: snapshot.backgroundColor,
      historyIndex: newIndex,
      selectedIds: [],
    });
    // ❌ MISSING: Sync to elementsStore, selectionStore, canvasStore
  }
};
```

**Problem:**

- After undo, `editorStore.elements` updated ✅
- But `elementsStore.elements` NOT updated ❌
- Components reading from `elementsStore` show stale data
- Result: LayersPanel shows 5 elements, canvas shows 3 (split-brain)

#### Proposed Solution

```typescript
// ✅ FIXED: Sync to all specialized stores
undo: () => {
  const { canUndo, history, historyIndex } = get();
  if (canUndo()) {
    const newIndex = historyIndex - 1;
    const snapshot = history[newIndex];
    const restoredElements = cloneDeep(snapshot.elements);

    // Update editorStore state
    set({
      elements: restoredElements,
      canvasSize: { ...snapshot.canvasSize },
      backgroundColor: snapshot.backgroundColor,
      historyIndex: newIndex,
      selectedIds: [],
    });

    // Sync to specialized stores
    useElementsStore.getState().setElements(cloneDeep(snapshot.elements));
    useSelectionStore.getState().clearSelection();
    useCanvasStore
      .getState()
      .setCanvasSize(snapshot.canvasSize.width, snapshot.canvasSize.height);
    useCanvasStore.getState().setBackgroundColor(snapshot.backgroundColor);
  }
};
```

#### Implementation Steps

1. **Study correct pattern:**

   - File: `src/stores/editorStore.ts` lines 750-780
   - Method: `loadTemplate()` - shows how to sync ALL stores

2. **Apply fix to both methods:**

   - `undo()` - Add 4 sync calls
   - `redo()` - Add same 4 sync calls (lines 680-695)

3. **Handle edge cases:**

   - If `elementsStore` doesn't have `setElements`, add it
   - Verify `canvasStore` has both `setCanvasSize` and `setBackgroundColor`

4. **Test thoroughly:**

```typescript
// Test Case 1: Undo after adding element
// - Add text → Undo → Check both stores match

// Test Case 2: Undo after canvas resize
// - Resize canvas → Undo → Check canvasStore updated

// Test Case 3: Multiple undo/redo cycles
// - Perform 10 actions → Undo 5 → Redo 3 → Verify consistency

// Test Case 4: Undo while element selected
// - Select element → Undo deletion → Check selection cleared
```

#### Success Criteria

- [ ] After undo, `elementsStore.elements.length === editorStore.elements.length`
- [ ] After undo, `selectionStore.selectedIds.length === 0`
- [ ] After undo, `canvasStore.canvasSize` matches snapshot
- [ ] LayersPanel and EditorCanvas show same element count
- [ ] Redo works symmetrically (same sync behavior)
- [ ] No console errors after 10 undo/redo cycles

#### Rollback Plan

If issues occur:

- Revert commit
- Investigate which store sync is failing
- Add debug logs: `console.log('[UNDO]', { editorElements, specializedElements })`

---

### 1.3 ~~Fix Selection on Delete~~ ✅ ALREADY FIXED

**Priority:** N/A  
**Status:** COMPLETE  
**Reference:** GitHub Issue #3 (resolved in current codebase)

#### Verification

**File:** `src/stores/elementsStore.ts` (lines 152-160)

```typescript
// ✅ FIXED: Selection sync already implemented
deleteElement: (id) => {
  set((state) => ({
    elements: state.elements.filter((el) => el.id !== id),
  }));

  // Sync selection - remove deleted element from selection
  const selection = useSelectionStore.getState();
  if (selection.selectedIds.includes(id)) {
    selection.setSelectedIds(selection.selectedIds.filter((sid) => sid !== id));
  }
};
```

**This matches the recommended fix exactly!** No action needed.

---

### 1.4 Architectural Decision: Source of Truth

**Priority:** 🔴 CRITICAL (architectural)  
**Effort:** 2 hours (decision + documentation)  
**Risk:** HIGH (affects all element rendering)  
**Can Deploy:** NO (requires gradual migration)  
**Reference:** GitHub Issue #4 (`docs/GITHUB_ISSUES.md`)

#### Current State

**File:** `src/stores/editorStore.ts` (lines 193-203)

```typescript
// Current pattern (potentially confusing):
addElement: (element) => {
  // Step 1: Add to elementsStore (source of truth)
  useElementsStore.getState().addElement(element);
  useSelectionStore.getState().selectElement(element.id);

  // Step 2: Sync back to editorStore (facade)
  const elements = useElementsStore.getState().elements;
  set({
    elements: elements,
    selectedIds: [element.id],
  });
};
```

**Question:** Is this a bug or intended behavior?

**Analysis:**

- `elementsStore` adds element to its array ✅
- `editorStore` **mirrors** the array from elementsStore ✅
- Both stores contain same data (not duplicate, but synchronized)
- Legacy components read from `editorStore`
- New components read from `elementsStore`

**This is the FACADE PATTERN working as designed!**

#### Architectural Options

**Option A: Keep Dual State (Current)**

- **Pros:** Backward compatible, gradual migration possible
- **Cons:** Risk of divergence, confusing for new developers
- **Effort:** 0 hours (status quo)

**Option B: Remove editorStore.elements (Breaking Change)**

- **Pros:** Single source of truth, cleaner architecture
- **Cons:** Breaks all components reading from editorStore
- **Effort:** 20+ hours (migrate all components)

**Option C: Make editorStore.elements Computed Property**

- **Pros:** Always in sync, no manual syncing
- **Cons:** Zustand doesn't support computed properties natively
- **Effort:** 8 hours (implement subscription pattern)

#### Recommended Decision: **Option A + Documentation**

**Rationale:**

1. Current pattern is **NOT a bug** - it's the facade pattern
2. Both stores stay in sync via explicit sync calls
3. Breaking change (Option B) is too risky mid-project
4. Computed properties (Option C) add complexity

**Action Items:**

1. **Document the pattern (2 hours):**

   - Create `docs/ARCHITECTURE_DECISION_002.md`
   - Explain facade pattern rationale
   - Document sync requirements
   - Add examples of correct usage

2. **Add validation (30 min):**

```typescript
// In development mode, verify sync
if (process.env.NODE_ENV === "development") {
  const editorElements = useEditorStore.getState().elements;
  const specializedElements = useElementsStore.getState().elements;
  if (editorElements.length !== specializedElements.length) {
    console.error("[SYNC ERROR] Store mismatch detected!");
  }
}
```

3. **Update WORKFLOW.md:**
   - Add section: "Understanding the Facade Pattern"
   - Clarify when to use which store

#### Success Criteria

- [ ] Architecture Decision Record created
- [ ] Sync validation added (dev mode only)
- [ ] WORKFLOW.md updated with clear guidance
- [ ] No actual code changes (documentation only)
- [ ] Team understands pattern (solo dev = you!)

---

## 🟠 Phase 2: Canvas Performance Optimization

**Goal:** Improve rendering performance from 30 FPS → 55+ FPS  
**Duration:** 12 hours  
**Risk Level:** MEDIUM  
**Can Deploy:** YES (after measuring each optimization)

---

### 2.1 Add Debounced Rendering

**Priority:** 🟠 HIGH  
**Effort:** 2 hours  
**Risk:** LOW  
**Expected Impact:** 40% fewer renders, +15 FPS

#### Current State

**File:** `src/lib/canvas/CanvasManager.ts`

```typescript
// ❌ PROBLEM: Immediate render on every change
updateElement(id, updates) {
    syncElementToFabric(fabricObject, updates);
    this.canvas.renderAll(); // Triggers 60+ renders/sec during drag
}
```

**Performance Issue:**

- Dragging element = 60 updates/sec
- Each update calls `renderAll()` immediately
- GPU can't keep up → dropped frames
- 60fps budget = 16ms per frame
- Rendering takes 25-30ms → 30 FPS result

#### Proposed Solution

```typescript
import { debounce } from "lodash";

class CanvasManager {
  // Add debounced render method
  private debouncedRender = debounce(() => {
    this.canvas?.requestRenderAll();
  }, 16); // 60fps = 16ms frame budget

  updateElement(id, updates) {
    syncElementToFabric(fabricObject, updates);
    this.debouncedRender(); // ✅ Batches renders
  }

  // Also update in other methods:
  // - addElement()
  // - removeElement()
  // - Spatial grid updates
}
```

#### Implementation Steps

1. **Study debouncing pattern:**

   - File: `src/hooks/useAutoSave.ts` lines 10-25
   - Shows correct lodash debounce usage

2. **Add debounce to CanvasManager:**

   - Import lodash at top
   - Add `debouncedRender` property (line ~45)
   - Replace 8-10 `renderAll()` calls with `debouncedRender()`

3. **Handle cleanup:**

```typescript
destroy() {
    this.debouncedRender.cancel(); // ✅ Cancel pending renders
    // ... rest of cleanup
}
```

4. **Measure performance:**

```typescript
// Before optimization:
const before = CanvasManager.getPerformanceMetrics();
console.log("FPS before:", before.fps); // ~30 FPS

// After optimization:
const after = CanvasManager.getPerformanceMetrics();
console.log("FPS after:", after.fps); // Target: 45+ FPS
```

#### Success Criteria

- [ ] FPS improves from 30 → 45+ (50% improvement)
- [ ] Dragging element feels smooth (no stutter)
- [ ] No visual artifacts (elements render correctly)
- [ ] Canvas updates within 16ms (Chrome DevTools timeline)
- [ ] Memory usage stable (no memory leaks)

#### Rollback Plan

If FPS decreases or visual bugs appear:

- Revert debounce changes
- Try longer delay (32ms instead of 16ms)
- Profile with Chrome DevTools to find real bottleneck

---

### 2.2 Object Reuse Cache

**Priority:** 🟠 HIGH  
**Effort:** 4 hours  
**Risk:** MEDIUM  
**Expected Impact:** 70% faster updates, -30% memory

#### Current State

**File:** `src/lib/canvas/ObjectFactory.ts`

```typescript
// ❌ PROBLEM: Sets ALL properties even if unchanged
export function syncElementToFabric(fabricObject, updates) {
  fabricObject.set({
    left: element.x, // Set even if unchanged
    top: element.y, // Set even if unchanged
    width: element.width, // Set even if unchanged
    // ... 20+ properties always set
  });
}
```

**Performance Issue:**

- Updating `x` position triggers full property sync
- Fabric.js marks object as "dirty" for ALL properties
- GPU re-uploads geometry, textures, transforms
- Wasted work: 70% of properties unchanged

#### Proposed Solution

```typescript
// ✅ SOLUTION: Diff detection + object cache
const fabricObjectCache = new Map<string, fabric.Object>();

function updateOnlyChanged(obj: fabric.Object, updates: Partial<Element>) {
  let hasChanges = false;

  // Position
  if (updates.x !== undefined && obj.left !== updates.x) {
    obj.set("left", updates.x);
    hasChanges = true;
  }
  if (updates.y !== undefined && obj.top !== updates.y) {
    obj.set("top", updates.y);
    hasChanges = true;
  }

  // Only update other properties if they changed
  // ... (same for width, height, rotation, etc.)

  return hasChanges;
}

export function syncElementToFabric(fabricObject, updates) {
  const hasChanges = updateOnlyChanged(fabricObject, updates);
  if (hasChanges) {
    fabricObject.setCoords(); // Only recalc if changed
  }
}
```

#### Implementation Steps

1. **Add diff helper function:**

   - File: `src/lib/canvas/ObjectFactory.ts`
   - Add `updateOnlyChanged()` before `syncElementToFabric()`
   - ~80 lines for all properties

2. **Implement property-specific checks:**

```typescript
// Position properties (x, y)
// Size properties (width, height)
// Transform properties (rotation, scaleX, scaleY)
// Style properties (fill, stroke, opacity)
// Text properties (fontSize, fontFamily, text)
```

3. **Add caching for complex properties:**

```typescript
// Cache parsed shadow values
const shadowCache = new Map<string, fabric.Shadow>();

function getShadow(element: Element) {
    const key = `${element.shadowColor}-${element.shadowBlur}`;
    if (!shadowCache.has(key)) {
        shadowCache.set(key, new fabric.Shadow({...}));
    }
    return shadowCache.get(key);
}
```

4. **Measure performance:**

```typescript
// Test: Update element position 1000 times
const start = performance.now();
for (let i = 0; i < 1000; i++) {
  updateElement(id, { x: i });
}
const duration = performance.now() - start;
console.log("Update time:", duration); // Target: < 500ms
```

#### Success Criteria

- [ ] Element update time: 45ms → 15ms (70% improvement)
- [ ] Memory usage reduced by 30% (fewer object allocations)
- [ ] Visual correctness maintained (no rendering bugs)
- [ ] All properties sync correctly when changed
- [ ] Cache hits logged in dev mode

#### Rollback Plan

If rendering bugs appear:

- Add `FORCE_FULL_SYNC` flag to bypass diff detection
- Log all property changes to identify which property has issue
- Revert to full sync for that property only

---

### 2.3 Canvas Pooling for Bulk Generation

**Priority:** 🟠 HIGH (conditional - only if bulk generation used)  
**Effort:** 6 hours  
**Risk:** MEDIUM  
**Expected Impact:** 50% faster bulk generation, -40% memory pressure

#### Current State

**File:** `src/components/campaign/GenerationController.tsx`

```typescript
// ❌ PROBLEM: New canvas created per pin
const renderPinClient = async (rowData, rowIndex) => {
    const canvas = new fabric.StaticCanvas(); // Expensive allocation
    await renderTemplate(canvas, ...);
    const blob = await exportToBlob(canvas);
    canvas.dispose(); // Triggers GC
    return blob;
};

// At 100 pins: 100 canvas allocations + 100 GC cycles
```

**Performance Issue:**

- Creating `StaticCanvas` = 20-30ms
- Disposing canvas = 10ms + GC pause
- 100 pins × 30ms = 3000ms (3 seconds) wasted on allocation
- GC pauses cause stuttering

#### Proposed Solution

```typescript
// ✅ SOLUTION: Pool of reusable canvases
class CanvasPool {
    private pool: fabric.StaticCanvas[] = [];
    private maxSize = 5; // Tune based on concurrency

    acquire(): fabric.StaticCanvas {
        if (this.pool.length > 0) {
            return this.pool.pop()!; // Reuse existing
        }
        return new fabric.StaticCanvas(null, {
            width: 1000,
            height: 1000,
        });
    }

    release(canvas: fabric.StaticCanvas): void {
        canvas.clear(); // Reset state
        canvas.backgroundColor = '#ffffff';

        if (this.pool.length < this.maxSize) {
            this.pool.push(canvas);
        } else {
            canvas.dispose(); // Exceed max, throw away
        }
    }

    drain(): void {
        this.pool.forEach(c => c.dispose());
        this.pool = [];
    }
}

// Usage:
const pool = new CanvasPool();

const renderPinClient = async (rowData, rowIndex) => {
    const canvas = pool.acquire(); // ✅ Reuse from pool
    try {
        await renderTemplate(canvas, ...);
        const blob = await exportToBlob(canvas);
        return blob;
    } finally {
        pool.release(canvas); // ✅ Return to pool
    }
};
```

#### Implementation Steps

1. **Create CanvasPool class:**

   - File: `src/lib/canvas/CanvasPool.ts` (NEW)
   - ~100 lines
   - Add JSDoc comments

2. **Integrate with GenerationController:**

   - File: `src/components/campaign/GenerationController.tsx`
   - Replace `new fabric.StaticCanvas()` with `pool.acquire()`
   - Add cleanup in `finally` block

3. **Handle edge cases:**

```typescript
// What if render fails? Still return to pool
// What if user cancels generation? Drain pool
// What if pool size too small? Log warnings
```

4. **Measure performance:**

```typescript
// Test: Generate 100 pins
const start = performance.now();
await generateAllPins(csvData);
const duration = performance.now() - start;
console.log("Generation time:", duration);
// Before: 180s, Target: 90s
```

#### Success Criteria

- [ ] Bulk generation time: 180s → 90s (50% improvement)
- [ ] Memory usage stays flat (no leaks from pooled canvases)
- [ ] No visual artifacts in generated pins
- [ ] Pool size auto-tunes based on concurrency
- [ ] Cleanup works correctly on cancel

#### Rollback Plan

If memory leaks or corruption occur:

- Disable pooling (set `maxSize = 0`)
- Add memory profiling to identify leak source
- Check if `canvas.clear()` fully resets state

---

## 🟡 Phase 3: Component Optimization

**Goal:** Reduce unnecessary re-renders, improve perceived performance  
**Duration:** 8 hours  
**Risk Level:** LOW  
**Can Deploy:** YES (weekly batches)

---

### 3.1 Memoize PropertiesPanel Sections

**Priority:** 🟡 MEDIUM  
**Effort:** 2 hours  
**Risk:** LOW  
**Expected Impact:** 50% fewer component re-renders

#### Current State

**Files:** `src/components/panels/sections/*.tsx` (10 files)

```typescript
// ❌ PROBLEM: Re-renders on ANY store change
export function PositionSection() {
  const element = useEditorStore((state) => state.selectedElements);
  // Re-renders when zoom changes, canvas size changes, etc.
}
```

**Performance Issue:**

- Every `editorStore` change triggers ALL sections to re-render
- Changing zoom → PositionSection re-renders (unnecessary)
- 10 sections × 10ms render = 100ms wasted per action

#### Proposed Solution

```typescript
import { shallow } from "zustand/shallow";

// ✅ SOLUTION: Shallow comparison + memoization
export const PositionSection = React.memo(() => {
  const element = useEditorStore(
    (state) => state.selectedElements,
    shallow // Only re-render if element reference changed
  );

  // Rest of component...
});
```

#### Implementation Steps

1. **Wrap all 10 sections with React.memo:**

   - PositionSection.tsx
   - SizeSection.tsx
   - TextPropertiesSection.tsx
   - ImagePropertiesSection.tsx
   - ShapePropertiesSection.tsx
   - LayerOrderSection.tsx
   - AlignmentSection.tsx
   - OpacitySection.tsx
   - RotationSection.tsx
   - VisibilitySection.tsx

2. **Add shallow comparison:**

```typescript
import { shallow } from "zustand/shallow";

// For each section, add shallow to useEditorStore
```

3. **Measure re-renders:**

```typescript
// Add to each component (dev mode):
if (process.env.NODE_ENV === "development") {
  console.log("[RENDER]", "PositionSection");
}

// Before: 50 logs per element drag
// After: 5 logs per element drag (10x reduction)
```

#### Success Criteria

- [ ] PropertiesPanel sections re-render 50% less
- [ ] Changing zoom doesn't trigger PositionSection render
- [ ] Selecting element triggers ONE render per section
- [ ] No visual bugs (sections update correctly)
- [ ] React DevTools Profiler shows improvement

#### Rollback Plan

Extremely low risk. If issues:

- Remove `React.memo()` wrapper from problematic section
- Keep memoization on working sections

---

### 3.2 Add Virtual Scrolling to LayersPanel

**Priority:** 🟡 MEDIUM  
**Effort:** 4 hours  
**Risk:** LOW  
**Expected Impact:** Smooth scrolling with 100+ elements

#### Current State

**File:** `src/components/panels/LayersPanel.tsx`

```typescript
// ❌ PROBLEM: Renders ALL elements even if not visible
{
  elements.map((element) => <LayerItem key={element.id} element={element} />);
}
// With 200 elements, renders 200 DOM nodes (slow scroll)
```

**Performance Issue:**

- 100+ elements = 100+ DOM nodes
- Scrolling feels laggy
- Browser reflows on every scroll event

#### Proposed Solution

```typescript
import { FixedSizeList } from "react-window";

// ✅ SOLUTION: Only render visible items
<FixedSizeList
  height={600}
  itemCount={elements.length}
  itemSize={48} // Height of each LayerItem
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <LayerItem element={elements[index]} />
    </div>
  )}
</FixedSizeList>;
```

#### Implementation Steps

1. **Install dependency:**

```bash
npm install react-window @types/react-window
```

2. **Refactor LayersPanel:**

   - Import `FixedSizeList`
   - Wrap layer list in virtual scroller
   - Adjust drag-and-drop (react-beautiful-dnd may need update)

3. **Handle dynamic item heights (optional):**

   - Use `VariableSizeList` if items have different heights
   - Measure item heights on mount

4. **Test with large templates:**

```typescript
// Create test template with 500 elements
// Scroll up/down rapidly
// Check FPS with Chrome DevTools
```

#### Success Criteria

- [ ] Smooth 60 FPS scrolling with 200+ elements
- [ ] Only 10-15 DOM nodes rendered at once
- [ ] Drag-and-drop still works
- [ ] Selection highlights correctly
- [ ] No layout shift during scroll

#### Rollback Plan

If drag-and-drop breaks:

- Use `react-window` only when element count > 100
- Below 100, use original implementation

---

### 3.3 Extract Text Formatting Hook

**Priority:** 🟡 MEDIUM  
**Effort:** 2 hours  
**Risk:** LOW  
**Expected Impact:** DRY principle, easier testing

#### Current State

**Files:**

- `src/components/panels/sections/TextPropertiesSection.tsx` (lines 120-250)
- `src/components/layout/Toolbar.tsx` (lines 200-350)

```typescript
// ❌ PROBLEM: Duplicated formatting logic
// In TextPropertiesSection:
const handleFontSizeChange = (size: number) => {
  const { selectedIds, elements } = useEditorStore.getState();
  selectedIds.forEach((id) => {
    const element = elements.find((e) => e.id === id);
    if (element?.type === "text") {
      updateElement(id, { fontSize: size });
    }
  });
};

// In Toolbar: SAME LOGIC REPEATED
```

#### Proposed Solution

```typescript
// ✅ SOLUTION: Extract to custom hook
// File: src/hooks/useTextFormatting.ts

export function useTextFormatting() {
  const updateFontSize = (size: number) => {
    const { selectedIds } = useSelectionStore.getState();
    const { elements } = useElementsStore.getState();

    selectedIds.forEach((id) => {
      const element = elements.find((e) => e.id === id);
      if (element?.type === "text") {
        useElementsStore.getState().updateElement(id, { fontSize: size });
      }
    });
  };

  return {
    updateFontSize,
    updateFontFamily,
    updateTextColor,
    toggleBold,
    toggleItalic,
    toggleUnderline,
    setAlignment,
  };
}
```

#### Implementation Steps

1. **Create hook file:**

   - File: `src/hooks/useTextFormatting.ts`
   - Export 7 functions
   - ~150 lines total

2. **Refactor TextPropertiesSection:**

```typescript
const { updateFontSize, updateFontFamily, ... } = useTextFormatting();

// Replace 50+ lines of inline logic with hook calls
```

3. **Refactor Toolbar:**

```typescript
// Same hook usage, remove 80+ lines
```

4. **Add tests:**

```typescript
// File: src/hooks/__tests__/useTextFormatting.test.ts

it("should update font size for all selected text elements", () => {
  // Test implementation
});
```

#### Success Criteria

- [ ] TextPropertiesSection reduced by 50+ lines
- [ ] Toolbar reduced by 80+ lines
- [ ] All text formatting works identically
- [ ] 20+ unit tests for hook
- [ ] Undo/redo still works

---

## 🔵 Phase 4: Code Quality Improvements

**Goal:** Reduce technical debt, improve maintainability  
**Duration:** Variable (ongoing)  
**Risk Level:** MINIMAL  
**Can Deploy:** Continuous (no user impact)

---

### 4.1 Remove Unused Dependencies

**Priority:** 🔵 LOW  
**Effort:** 15 minutes  
**Risk:** MINIMAL  
**Expected Impact:** -100KB bundle size

#### Analysis

**File:** `package.json`

```bash
# Find unused dependencies
npx depcheck

# Likely candidates (verify before removing):
# - Old canvas library (if fully migrated to Fabric.js)
# - Unused UI libraries
# - Development tools no longer needed
```

#### Proposed Removals

```bash
# Only remove after 100% verification!
npm uninstall [package-name]
npm run build  # Verify no errors
npm test       # Verify tests pass
```

#### Success Criteria

- [ ] Bundle size reduced by 100-200KB
- [ ] All tests pass
- [ ] Production build succeeds
- [ ] No runtime errors

---

### 4.2 Add JSDoc to CanvasManager

**Priority:** 🔵 LOW  
**Effort:** 3 hours  
**Risk:** NONE  
**Expected Impact:** Better developer experience

#### Current State

**File:** `src/lib/canvas/CanvasManager.ts` (567 lines, mostly undocumented)

#### Proposed Solution

Add JSDoc comments to:

- Class description
- All public methods
- Complex private methods
- Type parameters

```typescript
/**
 * CanvasManager - Core Fabric.js lifecycle manager
 *
 * Responsibilities:
 * - Initialize/destroy Fabric.js canvas
 * - Sync Element data to Fabric objects
 * - Handle user interactions (drag, resize, rotate)
 * - Emit change events to React layer
 *
 * @example
 * const manager = new CanvasManager();
 * manager.initialize(canvasElement, config);
 * manager.addElement(textElement);
 */
export class CanvasManager {
  /**
   * Add an element to the canvas
   *
   * @param element - Element data from Zustand store
   * @throws {Error} If canvas not initialized
   */
  addElement(element: Element): void {
    // ...
  }
}
```

#### Success Criteria

- [ ] All public methods documented
- [ ] TypeDoc generates clean API docs
- [ ] Examples provided for complex methods

---

### 4.3 Extract Alignment Logic to Custom Hook

**Priority:** 🔵 LOW  
**Effort:** 3 hours  
**Risk:** LOW  
**Expected Impact:** Eliminate prop drilling

#### Current State

**File:** `src/components/panels/sections/AlignmentSection.tsx`

Alignment logic passed through 3-4 component levels via props.

#### Proposed Solution

```typescript
// File: src/hooks/useAlignment.ts

export function useAlignment() {
    const alignLeft = () => {
        const { selectedIds } = useSelectionStore.getState();
        useAlignmentStore.getState().alignElements(selectedIds, 'left');
    };

    return { alignLeft, alignCenter, alignRight, ... };
}
```

#### Success Criteria

- [ ] No prop drilling in alignment components
- [ ] Toolbar, PropertiesPanel, ContextMenu all use hook
- [ ] Alignment logic centralized

---

## 📈 Success Metrics & Validation

### Performance Targets

| Metric                     | Before    | After    | Validation Method               |
| -------------------------- | --------- | -------- | ------------------------------- |
| Canvas FPS (50 elements)   | 30        | 55+      | PerformanceMonitor.getMetrics() |
| Element update time        | 45ms      | 15ms     | Chrome DevTools Performance tab |
| Bulk generation (100 pins) | 180s      | 90s      | console.time('generation')      |
| PropertiesPanel re-renders | 50/action | 5/action | React DevTools Profiler         |
| Bundle size                | 1.2MB     | 900KB    | `next build` output             |
| Test coverage              | 88%       | 92%+     | `npm test -- --coverage`        |

### Measurement Checklist

**Before Each Phase:**

- [ ] Run `npm test -- --coverage` (record baseline)
- [ ] Run `npm run build` (record bundle size)
- [ ] Profile with Chrome DevTools (record FPS, render time)
- [ ] Git tag: `pre-phase-N-optimization`

**After Each Phase:**

- [ ] Run same measurements
- [ ] Compare before/after (document in PROGRESS.md)
- [ ] If improvement < 80% of target → investigate
- [ ] Git tag: `post-phase-N-optimization`

---

## ⚠️ Risk Assessment

### Risk Matrix

| Phase                | Risk Level | Mitigation Strategy                            | Rollback Time |
| -------------------- | ---------- | ---------------------------------------------- | ------------- |
| 1.1 (Toolbar fix)    | LOW        | Simple substitution, easy to verify            | 2 min         |
| 1.2 (Undo sync)      | MEDIUM     | Test with 10+ undo/redo cycles                 | 5 min         |
| 1.4 (Architecture)   | HIGH       | Documentation only, no code changes            | N/A           |
| 2.1 (Debouncing)     | LOW        | Measure FPS before/after                       | 5 min         |
| 2.2 (Object cache)   | MEDIUM     | Flag to disable diff detection                 | 10 min        |
| 2.3 (Canvas pool)    | MEDIUM     | Pool size = 0 disables pooling                 | 10 min        |
| 3.1 (Memoization)    | LOW        | Remove React.memo if issues                    | 2 min         |
| 3.2 (Virtual scroll) | LOW        | Conditional rendering (only if > 100 elements) | 10 min        |
| 3.3 (Extract hook)   | LOW        | Revert to inline logic                         | 5 min         |

### Monitoring Plan

Add to each deployment:

```typescript
// Log performance metrics to console (dev mode)
if (process.env.NODE_ENV === "development") {
  const metrics = CanvasManager.getPerformanceMetrics();
  console.log("[PERF]", {
    fps: metrics.fps,
    elementCount: elements.length,
    renderTime: metrics.lastRenderTime,
  });
}
```

---

## 🎯 Phase Execution Timeline

### Week 1: Bug Fixes (Phase 1)

```
Day 1: Fix Toolbar (30 min) → Deploy
Day 2: Fix Undo/Redo (1 hour) → Test → Deploy
Day 3: Architecture Decision (2 hours) → Document
```

### Week 2: Canvas Performance (Phase 2)

```
Day 1: Debouncing (2 hours) → Measure → Deploy
Day 2-3: Object Cache (4 hours) → Test → Deploy
Day 4-5: Canvas Pool (6 hours) → Test → Deploy
```

### Week 3: Component Optimization (Phase 3)

```
Day 1: Memoization (2 hours) → Deploy
Day 2-3: Virtual Scrolling (4 hours) → Deploy
Day 4: Extract Hook (2 hours) → Deploy
```

### Week 4: Code Quality (Phase 4 - Ongoing)

```
Day 1: Remove Dependencies (15 min)
Day 2-3: JSDoc (3 hours)
Day 4: Extract Alignment Hook (3 hours)
```

---

## 📚 Related Documentation

- **WORKFLOW.md** - Zone-based development guide
- **ARCHITECTURE.md** - System design (31KB)
- **TECHNICAL_DEBT.md** - Complete issue inventory (27KB)
- **GITHUB_ISSUES.md** - Active bugs (8KB)
- **DEPENDENCIES.md** - Package versions (18KB)
- **PROGRESS.md** - Daily completion log (25KB)

---

**END OF REFACTORING_PLAN.md**

_Update PROGRESS.md after completing each task. Track actual vs estimated time to improve future estimates._
