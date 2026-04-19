# Feature: Foraging Workbench

## Summary

The home page is a server-rendered semantic foraging workbench that lets contributors exercise intent classification, clarification, and explanation flows manually through the browser.

## Contract

- `GET /` renders a typed `HomeScreenModel` for the foraging workbench.
- The workbench must expose:
  - a manual intent-rehearsal form that posts to `POST /actions/intent`
  - a clarification form that posts to `POST /actions/intent/clarify` when the workflow is awaiting clarification
  - a manual explanation-rehearsal form that posts to `POST /actions/explanation`
  - save-artifact forms for supported candidate cards that post to `POST /actions/artifact/save`
  - saved-artifact reuse forms that post to `POST /actions/artifact/use`
  - saved-artifact refinement forms that post to `POST /actions/artifact/refine`
- Successful intent submissions must render:
  - the latest input
  - classified intent
  - confidence band
  - provenance summary
  - detected species, habitat, region, and season cues
  - any missing context the classifier identified
  - workflow state
- Awaiting-clarification submissions must render:
  - the follow-up question
  - allowed options
  - the `workflowId` needed to continue the workflow
- Successful explanation submissions must render:
  - the submitted title
  - the explanation text
  - provenance summary
- Successful saved-artifact reuse must render:
  - an informational alert that the artifact was loaded
  - the intent input seeded from the saved artifact
  - a latest-intent result seeded from the saved artifact's stored source intent and cues
  - the explanation inputs seeded from the saved artifact summary, evidence, or cues
- Successful saved-artifact refinement must render:
  - an informational alert that the artifact was updated
  - the updated artifact title and summary in the saved-artifacts section
  - an updated timestamp when the refined artifact has changed since its original save
- The workbench may render a server-first map fragment when current leads or recent sessions have mappable spatial context.
- The workbench must render a saved-artifacts section showing persisted field notes, trails, and patch inspections when available.
- Saved artifacts may render stored evidence and cue summaries inline so the workbench supports lightweight comparison before reuse.
- Saved artifacts may render inline refinement controls for bounded edits such as title and summary changes.
- Saved artifacts may render recent revision entries inline so the workbench shows how an artifact changed over time without opening a separate editor.
- The workbench must render a recent-sessions section showing persisted recent-session snapshots when available.
- Invalid form input or typed app errors must render back into the workbench as user-visible alerts instead of raw JSON.

## Runtime Behavior

- The workbench must stay server-rendered by default rather than depending on client-side state management.
- HTML action routes must stay thin adapters over existing typed app messages and results.
- The home screen model must be assembled by a dedicated UI agent module instead of being hand-built inside the route or view layer.
- The browser UI should stay workbench-first and avoid developer-facing route catalogs, runtime diagnostics, roadmap notes, or visible trace identifiers.
- The browser UI should avoid seeded example text in placeholders and helper copy; forms should read as ready for real input rather than as mocked demos.
- The intent clarification path must reuse the same stored workflow state used by the JSON clarification endpoint.
- The workbench must make the semantic-foraging intent taxonomy visible instead of collapsing back to generic search/create/explain labels.
- Completed intent submissions must feed the same recent-session view shown on the workbench without requiring client-side state management.
- Supported candidate cards may save durable artifacts through the same app bus instead of bypassing it with view-local storage logic.
- The first map slice must remain useful as rendered HTML without requiring a browser-side map runtime.
- The physical-map slice may enhance the browser surface with provider-backed basemap tiles and public geodata overlays, with OpenStreetMap available as the default no-key basemap while server-rendered fallback content remains available when browser enhancement cannot run.
- The map panel may request current location by default when the browser map is available, and it may keep an explicit current-location control as a retry path without sending live coordinates back through the app bus.
- The explanation workbench must split multiline facts input into grounded fact strings before dispatching the typed explanation query.

## Regression Guardrails

- The workbench must remain usable in no-model mode.
- The workbench must not fork business logic away from the existing command and query paths.
- The view layer must continue rendering from typed screen models rather than route-local strings or ad hoc JSON parsing in the browser.
