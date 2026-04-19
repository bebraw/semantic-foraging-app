# Feature: Saved Artifacts

## Summary

The semantic-foraging workbench can turn promising leads into lightweight saved artifacts so a user can keep field notes, trail plans, and patch inspections as durable app-owned state rather than only inspecting transient candidate cards.

## Contract

- Saved artifacts must use explicit kinds from the first artifact slice:
  - `field-note`
  - `trail`
  - `patch-inspection`
- A saved artifact must include:
  - `artifactId`
  - `sourceCardId`
  - `kind`
  - `title`
  - `summary`
  - `sourceIntent`
  - `cues`
  - `evidence`
  - `spatialContext`
  - `savedAt`

## Runtime Behavior

- Saved artifacts must be assembled through typed app and domain contracts rather than route-local form parsing.
- The first implementation may save artifacts only from surfaced candidate cards instead of supporting freeform artifact authoring.
- The initial save path should support candidate kinds that map cleanly into durable artifacts:
  - `field-note` candidates save as `field-note`
  - `trail` candidates save as `trail`
  - `patch` candidates save as `patch-inspection`
- Saved artifacts must remain serializable so they can move through the storage boundary without view-specific data massaging.
- The home screen may render a bounded saved-artifacts section alongside transient candidate cards and recent sessions.

## Regression Guardrails

- Saving an artifact must not remove deterministic retrieval behavior from the current workbench.
- Unsupported candidate kinds must fail through a typed app error instead of saving partial or ambiguous artifact state.
- The initial artifact implementation must stay lightweight and process-local rather than choosing durable platform storage immediately.
