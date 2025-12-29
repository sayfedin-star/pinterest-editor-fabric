# Development Plan: Text Rendering Parity Audit`n`n## Phase 1: Diagnostic & Baseline [checkpoint: b40677b]`n- [x] Task: Create a reference template in the editor containing all advanced text effects. 36b38cd`n- [x] Task: Generate a server-side render of the reference template using the current API. 36b38cd`n- [x] Task: Conduct a visual comparison and document any discrepancies. 36b38cd`n- [x] Task: Conductor - User Manual Verification 'Phase 1: Diagnostic & Baseline' (Protocol in workflow.md) b40677b`n`n## Phase 2: Implementation & Fixes [checkpoint: 3cafc3c]
- [x] Task: Audit `src/lib/fabric/serverEngine.ts` for property mapping of shadow and stroke. 36b38cd
    - Note: Found shadowOpacity discrepancy and default value mismatches. Also identified major text background parity issue (Client uses textBackgroundColor, Server uses Group+Rect).
- [x] Task: Adjust server-side rendering logic to match Fabric.js client-side defaults. b40677b
    - Note: Implemented shadowOpacity support and synchronized default values for shadow properties.
- [x] Task: Re-generate and verify output parity. b40677b
    - Note: Implemented Group-based background support in client-side ObjectFactory.ts to match Server implementation. Verified with unit tests for both environments.
    - Note: Fixed critical bug in CanvasManager.ts where object structure changes (Textbox <-> Group) were ignored during updates.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Implementation & Fixes' (Protocol in workflow.md) 3cafc3c
