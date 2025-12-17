# 🔄 WORKFLOW.md - Pinterest Editor Fabric Development Guide

**Version:** 1.0  
**Last Updated:** December 17, 2024  
**Purpose:** Zone-based development workflow for solo developer using Claude Opus 4.5 Thinking

---

## 📖 Table of Contents

1. [Zone Architecture Overview](#zone-architecture-overview)
2. [Specification Template (8-Section Format)](#specification-template)
3. [Store Integration Rules](#store-integration-rules)
4. [Zone Identification Checklist](#zone-identification-checklist)
5. [Common Development Workflows](#common-development-workflows)
6. [Testing Requirements](#testing-requirements)
7. [Commit Message Format](#commit-message-format)

---

## 🏗️ Zone Architecture Overview

The Pinterest Editor is organized into **12 zones** for modular development. Each zone has clear responsibilities and boundaries.

### Zone Map

```
┌─────────────────────────────────────────────────────────────┐
│ USER-FACING ZONES (Components + UI)                         │
├─────────────────────────────────────────────────────────────┤
│ Zone 1: Template Editor                                     │
│   - EditorCanvas (Fabric.js wrapper)                        │
│   - Toolbar (undo/redo, zoom, alignment)                    │
│   - PropertiesPanel (element properties)                    │
│   - LayersPanel (z-index management)                        │
│   Location: src/components/editor/, src/components/panels/  │
│                                                             │
│ Zone 2: Campaign Management                                 │
│   - GenerationController (bulk pin rendering)               │
│   - CSV upload and parsing                                  │
│   - Progress tracking and export                            │
│   Location: src/components/campaign/                        │
│                                                             │
│ Zone 3: Template Organization                               │
│   - Categories and Tags management                          │
│   - Template metadata                                       │
│   Location: src/components/gallery/, src/stores/category*   │
│                                                             │
│ Zone 4: Dashboard                                           │
│   - Navigation hub                                          │
│   Location: src/app/dashboard/                              │
│                                                             │
│ Zone 5: Gallery                                             │
│   - Template browsing and selection                         │
│   Location: src/components/gallery/                         │
│                                                             │
│ Zone 6: Import                                              │
│   - Canva SVG import functionality                          │
│   Location: src/components/import/                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ INFRASTRUCTURE ZONES (State + Logic)                        │
├─────────────────────────────────────────────────────────────┤
│ Zone 7: State Management                                    │
│   - editorStore.ts (1,390 lines - FACADE)                   │
│   - elementsStore.ts (215 lines - SOURCE OF TRUTH)          │
│   - selectionStore.ts (61 lines)                            │
│   - canvasStore.ts (85 lines)                               │
│   - templateStore.ts (95 lines)                             │
│   - layersStore.ts (145 lines)                              │
│   - alignmentStore.ts (195 lines)                           │
│   + 7 additional stores (toastStore, generationStore, etc.) │
│   Location: src/stores/                                     │
│                                                             │
│ Zone 8: Canvas Engine                                       │
│   - CanvasManager.ts (567 lines - ORCHESTRATOR)             │
│   - ObjectFactory.ts (170 lines)                            │
│   - ViewportManager.ts (110 lines)                          │
│   - PerformanceMonitor.ts (90 lines)                        │
│   - SpatialHashGrid.ts (collision detection)                │
│   Location: src/lib/canvas/                                 │
│                                                             │
│ Zone 9: Utilities                                           │
│   - csvParser, fieldNameParser, validators                  │
│   Location: src/lib/utils/                                  │
│                                                             │
│ Zone 10: UI Components                                      │
│   - Design system components                                │
│   Location: src/components/ui/                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ EXTERNAL INTEGRATION ZONES                                  │
├─────────────────────────────────────────────────────────────┤
│ Zone 11: API Layer                                          │
│   - Next.js API routes                                      │
│   Location: src/app/api/                                    │
│                                                             │
│ Zone 12: Data Persistence                                   │
│   - Supabase integration                                    │
│   - S3 storage (Tebi)                                       │
│   Location: src/lib/db/, src/lib/storage/                   │
└─────────────────────────────────────────────────────────────┘
```

### Zone Responsibility Table

| Zone    | Primary Responsibility       | Touches Other Zones          | File Count |
| ------- | ---------------------------- | ---------------------------- | ---------- |
| Zone 1  | User interaction with canvas | 7 (state), 8 (canvas engine) | ~15 files  |
| Zone 2  | Bulk generation workflow     | 7, 8, 9, 11, 12              | ~8 files   |
| Zone 3  | Template metadata            | 7, 11, 12                    | ~5 files   |
| Zone 7  | Application state            | ALL (consumed by all)        | 14 stores  |
| Zone 8  | Fabric.js lifecycle          | 7 (syncs state)              | ~6 files   |
| Zone 11 | API endpoints                | 7, 12                        | ~12 routes |
| Zone 12 | Database/storage             | 11 (called by API)           | ~4 files   |

---

## 📝 Specification Template (8-Section Format)

**Use this format for EVERY feature specification you create for Claude Opus 4.5 Thinking.**

### Template Structure

```
SPECIFICATION: [Feature Name]

1. CONTEXT

What exists now:
- Reference actual files with paths and line numbers
- Example: "Template deletion currently in src/components/layout/LeftSidebar.tsx lines 120-180"

What was recently completed:
- Related work that impacts this feature
- Example: "PropertiesPanel was split into 10 sections (896→85 lines)"

Why this change is needed:
- User pain point or technical debt
- Example: "Users can't quickly duplicate templates without re-creating from scratch"

2. OBJECTIVE

High-level goal (WHAT, not HOW):
- One sentence describing user-facing outcome
- Example: "Enable users to duplicate templates with one click"

3. REQUIREMENTS

Use RFC 2119 keywords: MUST, SHOULD, MAY

Functional Requirements:
- MUST [specific behavior]
- MUST [data handling rule]
- SHOULD [nice-to-have feature]
- MAY [optional enhancement]

Non-Functional Requirements:
- MUST handle errors gracefully (show toast, no crashes)
- MUST maintain < 300 lines per file
- SHOULD complete within 2 seconds for typical use

Edge Cases:
- What if [scenario]?
- How to handle [error condition]?

4. ARCHITECTURE ANALYSIS

Patterns to follow:
- Study these files to see established patterns:
  - path/to/file.ts lines X-Y: [What pattern to observe]
  - path/to/another.ts: [Another pattern]

Example:
- src/stores/elementsStore.ts lines 100-104: How to add elements immutably
- src/lib/db/templates.ts lines 45-80: How saveTemplate() creates records

DO NOT invent new patterns - follow existing conventions!

5. REASONING QUESTIONS (for Claude Opus 4.5 Thinking Mode)

Before implementing, reason through:

Architectural Questions:
- [ ] Should this use editorStore (facade) or specialized stores directly?
- [ ] Does this need to sync to Fabric.js canvas?
- [ ] Should this be a component, hook, or utility function?

Integration Questions:
- [ ] Which existing components will use this?
- [ ] Does this affect undo/redo history?
- [ ] Are there similar patterns in the codebase to follow?

Edge Case Questions:
- [ ] What happens if [specific scenario]?
- [ ] How should errors be handled?
- [ ] What if user performs [unexpected action]?

Performance Questions:
- [ ] Will this cause excessive re-renders?
- [ ] Does this need debouncing/throttling?
- [ ] What's the worst-case data size?

6. SUCCESS CRITERIA

Concrete, testable checkboxes:

Functional:
- [ ] Feature works as described in Objective
- [ ] [Specific user action] produces [expected result]
- [ ] Works with edge case: [scenario]

Technical:
- [ ] No TypeScript errors
- [ ] No console warnings/errors
- [ ] Passes existing tests
- [ ] New tests written and passing

Integration:
- [ ] Works with existing undo/redo
- [ ] Syncs to all relevant stores
- [ ] No regressions in [related feature]

7. INTEGRATION POINTS

Data Flow:
User Action (Component)
  ↓
Store Update (which store?)
  ↓
Side Effects (canvas sync? API call?)
  ↓
UI Update (which components re-render?)

Store Sync Requirements:
- If updating elements → sync elementsStore → editorStore (facade)
- If changing selection → sync selectionStore → editorStore
- If modifying canvas → sync canvasStore → editorStore → CanvasManager

Components Affected:
- path/to/component.tsx - will need to [action]
- path/to/another.tsx - will consume new data

8. DELIVERABLES

Files to Create:
- src/path/to/newFile.ts (< 300 lines)
- src/path/to/newFile.test.ts (20+ test cases)

Files to Modify:
- src/existing/file.ts - Add [specific function/section]
- src/another/file.tsx - Refactor [section] to use new feature

Documentation:
- Update docs/ARCHITECTURE.md if adding new pattern
- Update docs/PROGRESS.md with completion status

Expected Effort:
- Implementation: [X hours]
- Testing: [Y hours]
- Risk Level: LOW / MEDIUM / HIGH
```

---

## 🔗 Store Integration Rules

### Source of Truth Hierarchy

**CRITICAL:** The codebase is in **dual-state transition**. Follow this hierarchy:

```
┌─────────────────────────────────────────────────────────────┐
│ SOURCE OF TRUTH (Read from these first)                     │
├─────────────────────────────────────────────────────────────┤
│ elementsStore.ts   → elements: Element[]                    │
│ selectionStore.ts  → selectedIds: string[]                  │
│ canvasStore.ts     → canvasSize, backgroundColor            │
│ templateStore.ts   → templateId, templateName               │
│ layersStore.ts     → layer ordering operations              │
│ alignmentStore.ts  → alignment/distribution logic           │
└─────────────────────────────────────────────────────────────┘
                            ↓ syncs to
┌─────────────────────────────────────────────────────────────┐
│ FACADE (For legacy compatibility)                           │
├─────────────────────────────────────────────────────────────┤
│ editorStore.ts     → mirrors specialized stores             │
│                    → keeps legacy consumers working         │
└─────────────────────────────────────────────────────────────┘
```

### Store Update Pattern

**When implementing any feature that modifies state:**

#### Pattern A: Adding an Element

```typescript
// ❌ WRONG (only updates facade)
useEditorStore.getState().addElement(element);

// ✅ CORRECT (source of truth first, then sync)
// Step 1: Update source of truth
useElementsStore.getState().addElement(element);
useSelectionStore.getState().selectElement(element.id);

// Step 2: editorStore automatically syncs (already implemented)
// No manual sync needed - editorStore.addElement() does this
```

#### Pattern B: Updating Canvas Config

```typescript
// ✅ CORRECT
useCanvasStore.getState().setBackgroundColor("#FF0000");
// editorStore facade syncs automatically
```

#### Pattern C: Undo/Redo (Special Case)

```typescript
// Must sync to ALL specialized stores
undo: () => {
  // 1. Update editorStore history
  set({ elements: snapshot.elements, historyIndex: newIndex });

  // 2. Sync to specialized stores
  useElementsStore.getState().setElements(snapshot.elements);
  useSelectionStore.getState().clearSelection();
  useCanvasStore.getState().setCanvasSize(w, h);
};
```

### Which Store to Use?

| Task                 | Store            | Method                       | File Location                     |
| -------------------- | ---------------- | ---------------------------- | --------------------------------- |
| Add element          | `elementsStore`  | `addElement()`               | `src/stores/elementsStore.ts:100` |
| Update element props | `elementsStore`  | `updateElement(id, updates)` | `src/stores/elementsStore.ts:107` |
| Delete element       | `elementsStore`  | `deleteElement(id)`          | `src/stores/elementsStore.ts:152` |
| Select element       | `selectionStore` | `selectElement(id)`          | `src/stores/selectionStore.ts`    |
| Multi-select         | `selectionStore` | `toggleSelection(id)`        | `src/stores/selectionStore.ts`    |
| Change canvas size   | `canvasStore`    | `setCanvasSize(w, h)`        | `src/stores/canvasStore.ts`       |
| Change bg color      | `canvasStore`    | `setBackgroundColor(color)`  | `src/stores/canvasStore.ts`       |
| Reorder layers       | `layersStore`    | `moveLayer*()`               | `src/stores/layersStore.ts`       |
| Align elements       | `alignmentStore` | `alignElements()`            | `src/stores/alignmentStore.ts`    |

---

## ✅ Zone Identification Checklist

**Before starting ANY feature, answer these questions:**

### Step 1: Identify Primary Zone

- [ ] Is this primarily a UI change? → Zone 1, 2, 3, 5, or 6
- [ ] Is this state management? → Zone 7
- [ ] Is this canvas rendering logic? → Zone 8
- [ ] Is this a data operation? → Zone 11 or 12

### Step 2: Identify Touched Zones

Check which zones will be affected:

- [ ] **Zone 7 (State):** Will this read/write store state?
- [ ] **Zone 8 (Canvas):** Will this affect Fabric.js rendering?
- [ ] **Zone 9 (Utils):** Will this need shared utilities?
- [ ] **Zone 11 (API):** Will this require server calls?
- [ ] **Zone 12 (Data):** Will this touch database/storage?

### Step 3: Check Cross-Zone Dependencies

```
If Primary Zone = Zone 1 (Template Editor):
  → ALWAYS touches Zone 7 (reads/writes state)
  → OFTEN touches Zone 8 (canvas updates)
  → SOMETIMES touches Zone 9 (utilities)

If Primary Zone = Zone 2 (Campaign):
  → ALWAYS touches Zone 7, 8, 11, 12
  → High complexity - break into smaller tasks

If Primary Zone = Zone 7 (State):
  → May trigger Zone 8 sync (via CanvasManager)
  → May trigger Zone 1 re-renders
```

### Step 4: Estimate Scope

- **Single-zone change:** 1-2 hours
- **Two-zone change:** 2-4 hours
- **Three+ zones:** Break into phases (4-8 hours)

---

## 🔨 Common Development Workflows

### Workflow 1: Adding a New Element Type

**Affected Zones:** 7 (State), 8 (Canvas), 9 (Types), 1 (UI)

#### Step-by-Step Process:

**Phase 1: Define Type (Zone 9)**

```typescript
// File: src/types/editor.ts
// Study existing types (TextElement, ImageElement) lines 50-120
// Add new type following same pattern
```

**Phase 2: Update State (Zone 7)**

```typescript
// File: src/stores/elementsStore.ts
// Study addElement() at line 100
// No changes needed - works with Element union type
```

**Phase 3: Canvas Rendering (Zone 8)**

```typescript
// File: src/lib/canvas/ObjectFactory.ts
// Study createFabricObject() lines 20-80
// Add case for new element type
```

**Phase 4: UI Controls (Zone 1)**

```typescript
// File: src/components/panels/sections/NewElementSection.tsx
// Study existing sections in src/components/panels/sections/
// Create < 200 line component
```

**Specification Template for Claude:**
Use Section Template above with:

- Context: "New element type needed for [use case]"
- Study: ObjectFactory.ts, elementsStore.ts, existing sections
- Edge cases: How to handle [specific scenario]?

---

### Workflow 2: Implementing Bulk Delete in Gallery

**Affected Zones:** 5 (Gallery), 11 (API), 12 (Data), 7 (State)

#### Implementation Sequence:

**1. Backend First (Zone 11 → 12)**

```typescript
// File: src/app/api/templates/bulk/route.ts (NEW)
// Study pattern: src/app/api/templates/route.ts lines 1-50
// Implement: DELETE endpoint accepting ids: string[]
// Test: Use Postman before building UI
```

**2. State Update (Zone 7)**

```typescript
// File: src/stores/templateMetadataStore.ts
// Add method: deleteMultipleTemplates(ids: string[])
// Study: existing deleteTemplate method
```

**3. UI Layer (Zone 5)**

```typescript
// File: src/components/gallery/TemplateCard.tsx
// Add: Checkbox selection (study multi-select patterns)
// Add: BulkActionToolbar component (< 150 lines)
```

**4. Integration Testing**

- [ ] Select 3 templates via checkboxes
- [ ] Click "Delete Selected"
- [ ] API returns 200
- [ ] Gallery refreshes
- [ ] Templates removed from database
- [ ] No console errors

---

### Workflow 3: Fixing a Bug (Example: Undo/Redo Sync)

**Reference:** GitHub Issue #2 in `docs/GITHUB_ISSUES.md`

**Affected Zones:** 7 (State)

#### Bug Fix Process:

**1. Understand Current Behavior**

```typescript
// File: src/stores/editorStore.ts lines 663-676
// Current code:
//   - Updates editorStore.elements
//   - Does NOT sync to elementsStore
//   - Components show stale data
```

**2. Study Correct Pattern**

```typescript
// Study: loadTemplate() method (lines 750-780)
// Shows: How to sync ALL specialized stores
```

**3. Apply Fix**

```typescript
// Add sync calls after state update:
//   useElementsStore.getState().setElements(...)
//   useSelectionStore.getState().clearSelection()
//   useCanvasStore.getState().setCanvasSize(...)
```

**4. Test Thoroughly**

- [ ] Undo works after adding element
- [ ] Undo works after deleting element
- [ ] Undo works after canvas resize
- [ ] Redo works in all cases
- [ ] LayersPanel shows correct count after undo
- [ ] EditorCanvas renders correct elements after undo

---

### Workflow 4: Optimizing Performance (Debouncing Canvas Renders)

**Affected Zones:** 8 (Canvas Engine)

**Reference:** Report 1's Zone 8 Analysis

#### Optimization Process:

**1. Measure Baseline**

```typescript
// Use PerformanceMonitor
const metrics = CanvasManager.getPerformanceMetrics();
console.log("Current FPS:", metrics.fps);
// Baseline: ~30 FPS on complex templates
```

**2. Study Pattern**

```typescript
// File: src/hooks/useAutoSave.ts lines 10-25
// Shows: How to use lodash debounce correctly
```

**3. Implement Debouncing**

```typescript
// File: src/lib/canvas/CanvasManager.ts
// Add at top of class:
private debouncedRender = debounce(() => {
  this.canvas?.requestRenderAll();
}, 16); // 60fps = 16ms frame budget

// Replace all this.canvas.renderAll() calls with:
this.debouncedRender();
```

**4. Verify Improvement**

```typescript
// After change
const metrics = CanvasManager.getPerformanceMetrics();
console.log("New FPS:", metrics.fps);
// Target: 50-55 FPS (40% improvement)
```

---

## 🧪 Testing Requirements

### Unit Testing (Jest)

**Location:** `src/**/__tests__/*.test.ts`

**What to test:**

- All store actions (add, update, delete)
- Utility functions (csvParser, fieldNameParser)
- Custom hooks (useAutoSave, useSynchronizationBridge)

**Test Structure:**

```typescript
describe("elementsStore", () => {
  beforeEach(() => {
    // Reset store to initial state
    useElementsStore.setState({ elements: [] });
  });

  it("should add element to store", () => {
    const element = { id: "1", type: "text" /* ... */ };
    useElementsStore.getState().addElement(element);
    expect(useElementsStore.getState().elements).toHaveLength(1);
  });

  it("should handle duplicate element with unique ID", () => {
    // Test implementation
  });
});
```

**Coverage Target:** 80% (currently ~50%)

### E2E Testing (Playwright)

**Location:** `e2e/*.spec.ts`

**Critical User Journeys:**

1. Create template (add text, image, shape)
2. Element operations (select, delete, duplicate, move)
3. Undo/redo functionality
4. Template loading/saving
5. Bulk generation with CSV

**Run Commands:**

```bash
npm run e2e       # Headless mode
npm run e2e:ui    # Interactive UI mode
```

### Integration Testing

**After any change touching multiple zones:**

- [ ] Test cross-zone data flow
- [ ] Test store sync (editorStore ↔ specialized stores)
- [ ] Test canvas sync (Zustand ↔ Fabric.js)
- [ ] Test API integration (UI → API → Database)

---

## 📦 Commit Message Format

Use conventional commits with zone prefixes:

### Format:

```
[Zone N] Type: Description

Optional body with details
```

### Types:

- `Add` - New feature
- `Fix` - Bug fix
- `Refactor` - Code restructuring (no behavior change)
- `Perf` - Performance improvement
- `Test` - Adding/updating tests
- `Docs` - Documentation only
- `Style` - Formatting, whitespace

### Examples:

**Single Zone:**

```
[Zone 1] Add: Keyboard shortcuts for zoom (Ctrl+Plus/Minus)

Implemented zoom in/out via keyboard.
Added event listeners in EditorCanvas.
Updated Toolbar to show shortcuts in tooltips.
```

**Multiple Zones:**

```
[Zone 7,8] Fix: Undo/redo doesn't sync to specialized stores

Fixed GitHub Issue #2.
Added sync calls to elementsStore, selectionStore, canvasStore.
Tested with 10 undo/redo cycles - no state divergence.
```

**Performance:**

```
[Zone 8] Perf: Debounce canvas renders (40% FPS improvement)

Added debouncedRender with 16ms delay.
Baseline: 30 FPS → After: 50 FPS on 50-element template.
```

**Refactoring:**

```
[Zone 1] Refactor: Extract PropertiesPanel into 10 sections

Split 896-line monolith into focused sections (< 150 lines each).
No behavior changes - same UI/UX.
Easier to test and maintain.
```

---

## 🎯 Quick Reference Card

### Before Starting ANY Task:

1. ✅ **Identify zones** using checklist
2. ✅ **Read relevant files** (don't guess patterns)
3. ✅ **Create 8-section spec** (don't code directly)
4. ✅ **Ask edge case questions** (use Thinking Mode)
5. ✅ **Write tests first** (TDD when possible)
6. ✅ **Verify store sync** (check facade updates)
7. ✅ **Test cross-zone integration** (not just unit tests)
8. ✅ **Document in PROGRESS.md** (track completion)

### When Stuck:

**Ask these questions:**

- "Which existing file does this similar to?" → Study that file
- "Which store is source of truth?" → Check Store Integration Rules
- "Does this need canvas sync?" → Check if Zone 8 is affected
- "What if [edge case]?" → Add to Reasoning Questions section

### File Size Limits:

- **Components:** < 300 lines (split into sections if larger)
- **Functions:** < 50 lines (extract helpers if longer)
- **Stores:** < 300 lines (already split into specialized stores)
- **Test files:** No limit (comprehensive coverage more important)

---

## 📚 Related Documentation

- **ARCHITECTURE.md** - System design, data flows (31KB)
- **TECHNICAL_DEBT.md** - Known issues, god components (27KB)
- **REFACTORING_PLAN.md** - Priority queue, effort estimates (31KB)
- **GITHUB_ISSUES.md** - Active bugs with file locations (8KB)
- **DEPENDENCIES.md** - Package versions, bundle sizes (18KB)
- **PROGRESS.md** - Daily logs, completed work (25KB)
- **ARCHITECTURE_DECISION_001.md** - Facade pattern rationale (7KB)

---

**END OF WORKFLOW.md**

_For questions or clarifications, reference this document and actual codebase files (not assumptions)._
