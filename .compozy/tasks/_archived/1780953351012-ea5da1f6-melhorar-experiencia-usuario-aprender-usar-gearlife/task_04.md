---
status: completed
title: Add or update tests for shared content, modal, and page rendering
type: frontend
complexity: medium
dependencies: [task_01, task_02, task_03]
---

# Add or update tests for shared content, modal, and page rendering

## Overview

Add or update UI tests that verify the shared learning content component renders correctly in both the info modal and the `/como-funciona` page, including the new CTA link.

<critical>
- Read the PRD and TechSpec before editing.
- Use existing Vitest patterns in the repository.
- Cover the shared component, modal wrapper, and public page rendering.
- Keep the tests focused on specific UI assertions.
</critical>

<requirements>
1. MUST add tests for `HowItWorksContent` rendering the expected headings and sections.
2. MUST add a test asserting the `/como-funciona` CTA link exists in `InitialInfoModal`.
3. MUST add or update the `/como-funciona` page render test to validate the shared content is present.
4. MUST use mock components for page wrappers like `SeoHead` and `PublicPageNav` if needed.
5. SHOULD keep test structure consistent with existing repository test conventions.
</requirements>

## Subtasks

- Add a unit test file for `HowItWorksContent` or update the existing `icons-and-initial-info.test.tsx` file.
- Add or update a modal wrapper test to assert the CTA link to `/como-funciona`.
- Update the page test for `ComoFuncionaPage` to assert the shared content renders.
- Run `yarn test` for the affected unit tests and confirm they pass.

## Implementation Details

- Add or update `tests/unit/components/how-it-works-content.test.tsx`.
- Update `tests/unit/components/modal-components.test.tsx` or the existing modal test file for CTA verification.
- Update `tests/unit/pages/public-pages.test.tsx` to reflect the refactored `/como-funciona` page.

### Relevant Files

- `tests/unit/components/how-it-works-content.test.tsx` — new shared component test target.
- `tests/unit/components/modal-components.test.tsx` — existing modal wrapper test file.
- `tests/unit/pages/public-pages.test.tsx` — page render tests for `/como-funciona`.

### Dependent Files

- `src/components/HowItWorksContent.tsx` — renders the shared content tested by the new unit tests.
- `src/components/InitialInfoModal.tsx` — CTA link verification.
- `src/pages/como-funciona.tsx` — page render verification.

### Related ADRs

- `adr-001.md` — Update the info modal and link it from the existing How It Works page.
- `adr-002.md` — Use a shared content component for the info modal and How It Works page.

## Deliverables

- New or updated unit tests for `HowItWorksContent`.
- Updated modal tests verifying the `/como-funciona` CTA.
- Updated page tests verifying shared content renders in `ComoFuncionaPage`.
- All affected tests passing.

## Tests

- Unit test that `HowItWorksContent` renders the key section headings.
- Unit test that `InitialInfoModal` contains the `/como-funciona` link.
- Unit test that `ComoFuncionaPage` renders shared content after the refactor.
- Run coverage for the affected modules.

## Success Criteria

- All new and updated tests pass.
- UI tests verify the modal CTA and page content.
- Coverage for touched files is at least 80%.
