---
status: completed
title: Extract shared learning content into a reusable component
type: frontend
complexity: medium
dependencies: []
---

# Extract shared learning content into a reusable component

## Overview

Extract the app learning content into a single shared React component so the info modal and `/como-funciona` page render the same copy and imagery without duplication.

<critical>
- Read the PRD and TechSpec before editing.
- Implement the shared content component in the UI layer only.
- Preserve current modal behavior and existing styles.
- Add tests for the new shared component.
</critical>

<requirements>
1. MUST create `src/components/HowItWorksContent.tsx` and export a reusable component.
2. MUST preserve the existing `src/components/InitialInfo.tsx` module path and semantics.
3. MUST move the current instructions, headings, and screenshot placeholders from `InitialInfo.tsx` into the shared component.
4. MUST keep the same image references and alt text concept for current login, equipment, component, and Strava configuration screens.
5. SHOULD expose a boolean prop to optionally render a reference link to `/como-funciona`.
</requirements>

## Subtasks

- Create `HowItWorksContent.tsx` with the current learning flow headings and screenshot sections.
- Copy the existing modal copy and image structure from `InitialInfo.tsx` into the new shared component.
- Update `src/components/InitialInfo.tsx` to render `HowItWorksContent`.
- Preserve the current style imports and CSS class usage.
- Confirm the shared component compiles without TypeScript errors.

## Implementation Details

- Add `src/components/HowItWorksContent.tsx`.
- Modify `src/components/InitialInfo.tsx` to import and render `HowItWorksContent`.
- Keep `src/styles/components/InitialInfo.module.css` unchanged unless minor layout adjustments are required.

### Relevant Files

- `src/components/InitialInfo.tsx` — source of current modal copy.
- `src/components/HowItWorksContent.tsx` — new shared component to create.
- `src/styles/components/InitialInfo.module.css` — existing styles referenced by the content.

### Dependent Files

- `src/components/InitialInfoModal.tsx` — continues to render `InitialInfo` inside the modal.
- `src/pages/como-funciona.tsx` — will later render the shared component.
- Tests for component rendering and content validation.

### Related ADRs

- `adr-002.md` — Use a shared content component for the info modal and How It Works page.

## Deliverables

- New `HowItWorksContent` React component that contains the current learning flow content.
- Updated `InitialInfo.tsx` wrapper rendering the shared component.
- Current UI screenshot references preserved or updated in the shared content.
- Tests verifying the shared component renders core headings and sections.

## Tests

- Unit test that `HowItWorksContent` renders the top-level title and step headings.
- Unit test that the component includes markup for login, equipment list, component tracking, and Strava config instructions.
- Unit test that the optional reference link prop conditionally renders the `/como-funciona` link.

## Success Criteria

- Component compiles cleanly with TypeScript.
- Shared content is extracted without changing the existing modal entrypoint.
- Tests for `HowItWorksContent` pass.
- Coverage for the shared content component is at least 80%.
