# Feature: Foraging Workbench

## Summary

The home page is a server-rendered semantic-foraging search surface that lets contributors drive intent classification, clarification, retrieval, artifact reuse, and explanation drafting through one minimal query-led UI.

## Contract

- `GET /` renders a typed `HomeScreenModel` for the semantic-foraging search surface.
- The search surface must expose:
  - a primary search form that posts to `POST /`
  - a clarification form that posts to `POST /actions/intent/clarify` when the workflow is awaiting clarification
  - a secondary explanation-drafting form that posts to `POST /actions/explanation` when explanation state is present
  - save-artifact forms for supported candidate cards that post to `POST /actions/artifact/save`
  - saved-artifact reuse forms that post to `POST /actions/artifact/use`
  - saved-artifact refinement forms that post to `POST /actions/artifact/refine`
  - saved-artifact revision restore forms that post to `POST /actions/artifact/restore`
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
  - direct actions for the allowed options in addition to manual clarification entry
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
- Successful saved-artifact revision reuse must render:
  - an informational alert that the revision was loaded
  - the intent and explanation forms seeded from the selected revision title, summary, and notes
  - the current stored artifact unchanged in the saved-artifacts section until a later refine or restore action occurs
- Successful saved-artifact refinement must render:
  - an informational alert that the artifact was updated
  - the updated artifact title and summary in the saved-artifacts section
  - updated artifact notes when provided
  - an updated timestamp when the refined artifact has changed since its original save
- Successful saved-artifact revision restore must render:
  - an informational alert that the artifact was restored
  - the restored artifact title, summary, and notes in the saved-artifacts section
  - a new revision-history entry showing that a restore occurred
- The search surface may render a server-first map fragment when the semantic presentation layer selects `map` and current leads or recent sessions have mappable spatial context.
- The search surface must render a saved-artifacts section showing persisted field notes, trails, and patch inspections when available.
- Saved artifacts may render stored evidence and cue summaries inline so the workbench supports lightweight comparison before reuse.
- Saved artifacts may render inline refinement controls for bounded edits such as title, summary, and notes changes.
- Saved artifacts may render recent revision entries inline so the workbench shows how an artifact changed over time without opening a separate editor.
- Saved artifacts may render restore controls for recent revision entries so revision history is actionable rather than read-only.
- Saved artifacts may render revision reuse controls so historical artifact states can continue the workbench without first restoring them.
- Saved artifacts may render deterministic change summaries for revision entries so the current artifact can be compared against historical revisions inline.
- The search surface must render a recent-sessions section showing persisted recent-session snapshots when available.
- Persisted recent sessions must expose a direct way to rerun the stored query from the search surface.
- Wide layouts may place recent searches in a left rail and saved artifacts or explanation workbench content in a right rail so the search form and active results stay centered, while collapsing the right rail when that support content is absent.
- Invalid form input or typed app errors must render back into the search surface as user-visible alerts instead of raw JSON.

## Runtime Behavior

- The search surface must stay server-rendered by default rather than depending on client-side state management.
- The initial search submission must render back on `/` so the browser stays on the home route after a query.
- A successful initial search submission must normalize the submitted query into the browser URL as `GET /?q=...` so reload and share preserve the current search text.
- HTML action routes must stay thin adapters over existing typed app messages and results.
- The home screen model must be assembled by a dedicated UI agent module instead of being hand-built inside the route or view layer.
- The browser UI should stay search-first and avoid developer-facing route catalogs, runtime diagnostics, roadmap notes, or visible trace identifiers.
- Result headers and supporting copy should stay query-first and avoid explanatory metatext about why a particular result view was selected.
- The primary search affordance may include example queries when those examples clarify supported semantic result shapes, but they should stay behind a compact on-demand control instead of rendering expanded by default.
- Clicking an example query must submit the clicked example even when the visible text input still contains a previous search.
- The empty state should not repeat the example queries as inert content elsewhere on the page.
- The intent clarification path must reuse the same stored workflow state used by the JSON clarification endpoint.
- The search surface must make the semantic-foraging intent taxonomy visible through lightweight metadata instead of a fixed diagnostic panel stack.
- Completed intent submissions must feed the same recent-session view shown on the search surface without requiring client-side state management.
- Supported candidate cards may save durable artifacts through the same app bus instead of bypassing it with view-local storage logic.
- The first map slice must remain useful as rendered HTML without requiring a browser-side map runtime.
- The physical-map slice may enhance the browser surface with provider-backed basemap tiles and public geodata overlays, with OpenStreetMap available as the default no-key basemap while server-rendered fallback content remains available when browser enhancement cannot run.
- The map panel may request current location by default when the browser map is available, and it may keep an explicit current-location control as a retry path without sending live coordinates back through the app bus.
- The explanation-drafting form must split multiline facts input into grounded fact strings before dispatching the typed explanation query.

## Regression Guardrails

- The search surface must remain usable in no-model mode.
- The search surface must not fork business logic away from the existing command and query paths.
- The view layer must continue rendering from typed screen models rather than route-local strings or ad hoc JSON parsing in the browser.
