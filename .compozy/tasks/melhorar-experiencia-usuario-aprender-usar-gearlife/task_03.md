---
status: completed
title: Refactor `/como-funciona` page to reuse the shared learning content
type: frontend
complexity: low
dependencies: [task_01]
---

# Refactor `/como-funciona` page to reuse the shared learning content

## Overview

Refactor the existing `/como-funciona` page so it renders the shared learning content component rather than maintaining separate page copy, keeping the reference page aligned with the info modal.

<critical>
- Read the PRD and TechSpec before editing.
- Preserve the public page layout, SEO metadata, and existing navigation.
- Reuse the shared component to avoid duplicate instructional copy.
- Include tests for the revised page rendering.
</critical>

<requirements>
1. MUST import and render the shared `HowItWorksContent` component in `src/pages/como-funciona.tsx`.
2. MUST preserve `SeoHead` and `PublicPageNav` usage in the page wrapper.
3. MUST keep the page title and descriptive text consistent with the shared content.
4. MUST not remove the `/como-funciona` route or its existing page shell.
5. SHOULD allow the page to render more detail or page-specific context if needed below the shared content.
</requirements>

## Subtasks

- Update `src/pages/como-funciona.tsx` to import `HowItWorksContent`.
- Replace inline page copy with the shared component render.
- Confirm the page still renders `SeoHead` and `PublicPageNav`.
- Run the page render test to verify the shared content appears.

## Implementation Details

- Modify `src/pages/como-funciona.tsx` to render the shared content component.
- Keep `src/components/PublicPageNav.tsx` and `src/components/SeoHead.tsx` usage unchanged.
- If needed, add a small page-specific wrapper around the shared content.

### Relevant Files

- `src/pages/como-funciona.tsx` — page to refactor.
- `src/components/HowItWorksContent.tsx` — shared component from Task 01.
- `src/components/PublicPageNav.tsx` — still used by the page.
- `src/components/SeoHead.tsx` — page metadata wrapper.

### Dependent Files

- `tests/unit/pages/public-pages.test.tsx` — to validate page rendering.
- `src/components/HowItWorksContent.tsx` — shared content used by the page.

### Related ADRs

- `adr-001.md` — Update the info modal and link it from the existing How It Works page.

## Deliverables

- Updated `/como-funciona` page that renders `HowItWorksContent`.
- Preserved page metadata and navigation.
- Page render tests updated or added to validate shared content.

## Tests

- Render `ComoFuncionaPage` and assert the top-level learning page title appears.
- Assert the shared component content appears inside the page.
- Confirm `SeoHead` and `PublicPageNav` are still part of the page render flow, if mocked in tests.

## Success Criteria

- `/como-funciona` page compiles cleanly.
- Page render tests pass.
- The learning content is unified with the modal content.
- Test coverage for the page changes is at least 80%.
