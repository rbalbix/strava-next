# Technical Specification: Improve self-serve learning for GearLife

## Executive Summary

This TechSpec describes the front-end implementation required to update GearLife’s self-serve learning experience. The chosen approach is to extract the shared learning content into a reusable React component and reuse it in both the existing info modal and the `/como-funciona` page. This keeps modal and page content synchronized while preserving a fast in-app help flow and a dedicated reference page.

The primary trade-off is slightly more component structure in the UI layer in exchange for one source of truth for the learning content.

## Background

The PRD requires updating the current `InitialInfo` modal content and images, then linking that modal to the existing `/como-funciona` page. The goal is to reduce user confusion and keep the help content aligned across quick-start and reference experiences.

Current implementation:

- `src/components/InitialInfo.tsx`: modal content with headings, images and instruction text.
- `src/components/InitialInfoModal.tsx`: modal wrapper that renders `InitialInfo`.
- `src/pages/como-funciona.tsx`: standalone public page with separate text.

## Scope

### In-scope

- Extract shared learning content into a new reusable component.
- Update the info modal content, copy and screenshot references.
- Update `/src/pages/como-funciona.tsx` to reuse the shared learning content.
- Keep the Header and Sidebar `Ajuda` button behavior unchanged, preserving `openModal('info')`.
- Add or improve the modal CTA that links to `/como-funciona`.
- Add unit tests for the shared component and render tests for the modal and page.

### Out-of-scope

- Backend APIs or Strava integration logic.
- New onboarding flows, tooltips, or guided tours.
- Any changes to data models or activity processing.
- New routes beyond `/como-funciona`.

## Architecture

The implementation stays entirely in the client UI layer.

### Proposed structure

- `src/components/HowItWorksContent.tsx`: shared learning content component.
- `src/components/InitialInfo.tsx`: wrapper for the modal to render the shared component and preserve existing import paths.
- `src/components/InitialInfoModal.tsx`: modal wrapper remains responsible for close behavior and accessibility, and should include a CTA link to `/como-funciona`.
- `src/pages/como-funciona.tsx`: page wrapper imports the shared component and renders it within the public page layout.

This structure preserves the current modal entrypoints while introducing a single source of truth for the content itself.

## Components

### HowItWorksContent

A new shared component that contains the learning content and screenshot layout.

Responsibilities:

- Render current login, equipment list, component tracking, and Strava note setup instructions.
- Render current image references for each step.
- Keep the text and screen captions aligned with the app flow.

### InitialInfo

A small wrapper component for the existing modal entrypoint.

Responsibilities:

- Import and render `HowItWorksContent`.
- Preserve the module export used by `InitialInfoModal`.
- Optionally render the CTA link to `/como-funciona` if that link belongs within the modal wrapper rather than the shared content.

### InitialInfoModal

Responsibilities stay unchanged:

- Render the modal UI and close button.
- Render `InitialInfo` inside the modal body.
- Ensure `aria-labelledby` and `aria-describedby` IDs remain correct.

### ComoFuncionaPage

Responsibilities:

- Continue to render `SeoHead` and `PublicPageNav`.
- Use `HowItWorksContent` inside the page article.
- Add any page-specific expansion or detail below the shared content if needed.

## Shared content pattern

The shared component should own the canonical help copy and screenshot structure. The modal wrapper and page wrapper should only control surrounding layout and navigation.

This prevents:

- duplicated text in `InitialInfo.tsx` and `como-funciona.tsx`
- diverging terminology between the quick-start modal and the reference page

## Core Interfaces

### Component props

```ts
export interface HowItWorksContentProps {
  showReferenceLink?: boolean;
}
```

### React implementation example

```tsx
export default function HowItWorksContent({
  showReferenceLink = false,
}: HowItWorksContentProps) {
  return (
    <div>
      <h1>How GearLife works</h1>
      {/* shared steps and screenshots */}
      {showReferenceLink ? (
        <a href='/como-funciona'>Read the full guide</a>
      ) : null}
    </div>
  );
}
```

### Go-style content model

```go
type HowItWorksContentProps struct {
    ShowReferenceLink bool
}
```

## Testing Strategy

Use existing `vitest` component test patterns.

### Unit tests

- Add or update a test file for `HowItWorksContent`.
- Verify the shared content renders the current titles, steps, and screenshot image count.
- Verify the `showReferenceLink` prop adds the `/como-funciona` CTA only when enabled.

### Render tests

- Update `tests/unit/components/icons-and-initial-info.test.tsx` or create a new test file to render `InitialInfo` and confirm it contains the shared content.
- Update `tests/unit/pages/public-pages.test.tsx` to assert the `ComoFuncionaPage` renders the shared content and the page title.

### Acceptance criteria

- `HowItWorksContent` test confirms the primary headings and step sections exist.
- Modal render test confirms the CTA link to `/como-funciona` is present inside `InitialInfoModal` or `InitialInfo`.
- Page render test confirms the `ComoFuncionaPage` still mounts and includes the shared content.

## Development Sequencing

1. Create `src/components/HowItWorksContent.tsx` with the shared learning content structure. (Base for all other updates)
2. Update `src/components/InitialInfo.tsx` to render `HowItWorksContent` and preserve the existing import entrypoint. (Depends on step 1)
3. Update `src/components/InitialInfoModal.tsx` to include a clear `/como-funciona` CTA and verify accessibility labels. (Depends on step 2)
4. Update `src/pages/como-funciona.tsx` to render `HowItWorksContent` inside the page layout. (Depends on step 1)
5. Replace or verify image asset references and update screenshot paths in the shared content. (Depends on step 1)
6. Add or update unit tests for `HowItWorksContent`, `InitialInfo`, and `ComoFuncionaPage`. (Depends on steps 1-4)
7. Run `yarn test` and validate the new page and modal behavior. (Final validation)

## Risks and Mitigations

- Risk: the shared component becomes too large and hard to maintain.
  - Mitigation: keep it focused on the learning content, not layout or navigation.
- Risk: modal and page styling diverge after the shared component is integrated.
  - Mitigation: keep modal-specific styling in the wrapper and page-specific styling in the page component.
- Risk: the `/como-funciona` page loses existing SEO metadata or page structure.
  - Mitigation: preserve `SeoHead` and `PublicPageNav` in the page wrapper.

## Architecture Decision Records

- `adr-001.md` — Update the info modal and link it from the existing How It Works page.
- `adr-002.md` — Use a shared content component for the info modal and How It Works page.
