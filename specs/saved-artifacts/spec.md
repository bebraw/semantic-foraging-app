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
  - optional `notes`
  - `sourceIntent`
  - `cues`
  - `evidence`
  - `spatialContext`
  - `savedAt`
  - `updatedAt`
  - `revisions`

## Runtime Behavior

- Saved artifacts must be assembled through typed app and domain contracts rather than route-local form parsing.
- The first implementation saves artifacts only from surfaced candidate cards instead of supporting freeform artifact authoring.
- The initial save path should support candidate kinds that map cleanly into durable artifacts:
  - `field-note` candidates save as `field-note`
  - `trail` candidates save as `trail`
  - `patch` candidates save as `patch-inspection`
- The workbench must expose a server-rendered save action that posts the current candidate payload and completed intent state to `POST /actions/artifact/save`.
- The workbench must expose a server-rendered reuse action that posts an `artifactId` to `POST /actions/artifact/use`.
- The workbench must expose a server-rendered refine action that posts an `artifactId`, title, summary, and optional notes to `POST /actions/artifact/refine`.
- The workbench must expose a server-rendered restore action that posts an `artifactId` and revision `recordedAt` to `POST /actions/artifact/restore`.
- Reusing a saved artifact must load it through the saved-artifact repository boundary instead of trusting a browser-roundtripped artifact payload.
- Reusing a saved artifact must seed the existing intent and explanation forms so the workbench can refine a saved trail, note, or patch inspection without introducing a separate artifact editor yet.
- Reusing a saved artifact may synthesize a typed completed intent state with explicit artifact-reuse provenance so the workbench can continue retrieval from the artifact's stored source intent and cues.
- Refining a saved artifact must update the existing stored artifact through the repository boundary instead of creating a duplicate artifact record.
- Refining a saved artifact should advance `updatedAt` so the workbench can show that the artifact has changed since it was first saved.
- Saved artifacts should keep a lightweight revision log so bounded refinements remain inspectable instead of silently overwriting the previous title and summary.
- Saved artifacts may carry bounded freeform notes so a field note, trail, or patch inspection can keep artifact-specific detail without opening a separate editor.
- Saved artifact revision history may be actionable so a user can restore the current artifact state to a previously recorded revision without leaving the workbench.
- Saved artifacts must remain serializable so they can move through the storage boundary without view-specific data massaging.
- The home screen must render a bounded saved-artifacts section alongside transient candidate cards and recent sessions.
- The saved-artifacts section may expose stored evidence notes and cue summaries directly so multiple artifacts can be compared without loading each one back into the workbench first.
- The saved-artifacts section may expose recent revision entries inline so a user can compare the current artifact with its latest saved/refined states.

## Regression Guardrails

- Saving an artifact must not remove deterministic retrieval behavior from the current workbench.
- Missing saved artifacts must fail through a typed app error instead of degrading silently into empty workbench state.
- Unsupported candidate kinds must fail through a typed app error instead of saving partial or ambiguous artifact state.
- The initial artifact implementation must stay lightweight and process-local rather than choosing durable platform storage immediately.
