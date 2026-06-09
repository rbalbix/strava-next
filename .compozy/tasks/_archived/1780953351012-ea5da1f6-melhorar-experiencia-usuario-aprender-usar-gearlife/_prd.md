# Improve self-serve learning for GearLife

## Overview

Improve GearLife’s self-serve learning path by updating the existing info modal copy and images, then linking that modal to the existing `/como-funciona` page. The intent is to make the app’s usage clear enough that a new user has no doubts after reading the instructions.

## Goals

- Make first-time use of GearLife immediately understandable.
- Keep the quick-start help accessible from the Header and Sidebar via the info modal.
- Ensure the standalone `/como-funciona` page becomes the full learning reference.
- Synchronize messaging so the modal and page do not conflict.
- Replace outdated instructions and images with current app screens.

## User Stories

- As a new user, I want to understand how to connect my Strava account so I can start using GearLife.
- As a new user, I want to recognize the current login, equipment list, and component tracking screens so I know what to expect.
- As a new user, I want a clear explanation of how to use Strava private notes for component tracking so I can set up maintenance correctly.
- As an existing user, I want a quick reference accessible from the Header/Sidebar so I can refresh my understanding without leaving the app.
- As a user, I want a link from the modal to `/como-funciona` so I can access the full reference when I need more detail.

## Core Features

- Update `InitialInfo` modal copy to reflect the current app UI and the current terminology used in GearLife.
- Replace the outdated modal images with current screenshots for login, equipment list, components, and Strava note configuration.
- Keep the info icon in `Header.tsx` and `Sidebar.tsx` opening the modal as the quick-start help entry point.
- Add or improve a clear call-to-action inside the modal linking to `/como-funciona`.
- Refresh `/src/pages/como-funciona.tsx` copy so it matches the modal’s quick-start steps and expands on user actions.
- Keep terminology consistent across the modal and page for Strava OAuth, equipment meaning, component codes, and activity tagging.

## User Experience

- The user opens GearLife and immediately sees an info icon in the Header or Sidebar.
- Clicking the icon opens a concise modal with the app purpose, login step, equipment view, component tracking, and a link to the full reference page.
- The modal uses current screenshots, clear labels, and step-by-step text.
- The `/como-funciona` page becomes the canonical learning page with a clear introduction, start steps, and illustrated workflow explanations.
- After reading the modal or page, the user should know how to connect Strava, what the main dashboard represents, how to tag Strava activities for maintenance tracking, and where to find more details.

## Non-Goals

- Do not build a new onboarding wizard or step-by-step guided tour.
- Do not add new in-app tooltip overlays beyond the modal and the reference page.
- Do not change how Strava activities are processed or how the data model works.
- Do not create a separate first-run flow outside the existing modal and page experience.

## Phased Rollout Plan

1. Update the info modal content and images.
2. Add or improve the link from the modal to `/como-funciona`.
3. Refresh `/src/pages/como-funciona.tsx` content for the full reference.
4. Verify copy consistency between the modal and the page.
5. Release as a content/UI update only.

## Success Metrics

- The user finds the info modal quickly from the Header/Sidebar.
- The modal and page content reflect the current app screens and workflow.
- The modal links clearly to `/como-funciona`.
- User confusion about Strava setup and component tracking decreases.
- No outdated instructions remain visible in the app.

## Risks and Mitigations

- Risk: modal and page wording diverge over time.
  - Mitigation: keep a shared checklist or reference for terminology and update both together.
- Risk: screenshots become outdated again after UI changes.
  - Mitigation: document the required screenshots and match them to current screen names.
- Risk: users still misunderstand Strava activity tagging.
  - Mitigation: use explicit examples and a short “do this / don’t do this” note with a link to the full page.

## Architecture Decision Records

- `adr-001.md` — Update the info modal and link it from the existing How It Works page.

## Open Questions

- Should the modal include the full list of component codes, or just a short note pointing users to `/como-funciona`?
- Should `/como-funciona` include a “common mistakes” section for Strava activity tagging?
- Should the visible label for the Header info icon be expanded to make it clearer that it leads to usage instructions?
