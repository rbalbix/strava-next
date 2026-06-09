---
status: completed
title: Update the info modal wrapper to include the How It Works CTA
type: frontend
complexity: low
dependencies: [task_01]
---

# Update the info modal wrapper to include the How It Works CTA

## Overview

Update the existing info modal wrapper so it preserves accessibility and adds a clear call-to-action linking users from the quick-start modal to the full `/como-funciona` page.

<critical>
- Read the PRD and TechSpec before editing.
- Keep the modal open path and close behavior unchanged.
- Ensure the new CTA is fully accessible and visible inside the modal.
- Include tests as part of this implementation.
</critical>

<requirements>
1. MUST preserve `InitialInfoModal` as the content wrapper used by the `info` modal.
2. MUST keep the `aria-labelledby` and `aria-describedby` IDs aligned with modal content.
3. MUST add a visible link or button inside the modal that navigates to `/como-funciona`.
4. MUST not change the `openModal('info')` interaction in `Header.tsx` or `Sidebar.tsx`.
5. SHOULD keep modal styling consistent with the existing dialog.
</requirements>

## Subtasks

- Review `src/components/InitialInfoModal.tsx` modal structure and accessibility IDs.
- Add a CTA link to `/como-funciona` inside the modal copy or footer.
- Confirm the modal still renders `InitialInfo` and the close button works.
- Run a render test for `InitialInfoModal` to assert the CTA link exists.

## Implementation Details

- Modify `src/components/InitialInfoModal.tsx` to render the `/como-funciona` CTA.
- Keep `src/components/InitialInfo.tsx` as the shared content source.
- Verify `src/components/ModalContainer.tsx` still uses `InitialInfoModal` for `activeModal === 'info'`.

### Relevant Files

- `src/components/InitialInfoModal.tsx` — modal wrapper to update.
- `src/components/InitialInfo.tsx` — shared content rendered inside the modal.
- `src/components/ModalContainer.tsx` — entrypoint for the info modal.

### Dependent Files

- `tests/unit/components/modal-components.test.tsx` or equivalent modal test file.
- `src/pages/como-funciona.tsx` because the CTA targets that page.

### Related ADRs

- `adr-001.md` — Update the info modal and link it from the existing How It Works page.

## Deliverables

- Updated `InitialInfoModal.tsx` with a visible, accessible link to `/como-funciona`.
- No change in modal activation flow from the Header or Sidebar.
- Tests verifying the CTA link appears and is operable.

## Tests

- Render `InitialInfoModal` and assert the `/como-funciona` link text is present.
- Assert the modal still contains the close button and dialog role.
- Verify the link has `href='/como-funciona'`.

## Success Criteria

- Modal wrapper compiles and renders with the new CTA.
- Modal accessibility attributes remain valid.
- Modal tests pass.
- Coverage for the modal changes is at least 80%.
