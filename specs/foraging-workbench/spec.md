# Feature: Foraging Workbench

## Summary

The home page is a server-rendered semantic foraging workbench that lets contributors exercise intent classification, clarification, and explanation flows manually through the browser.

## Contract

- `GET /` renders a typed `HomeScreenModel` for the foraging workbench.
- The workbench must expose:
  - a manual intent-rehearsal form that posts to `POST /actions/intent`
  - a clarification form that posts to `POST /actions/intent/clarify` when the workflow is awaiting clarification
  - a manual explanation-rehearsal form that posts to `POST /actions/explanation`
  - the active runtime capability summary already exposed by the app shell
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
- The workbench may render a server-first map fragment when current leads or recent sessions have mappable spatial context.
- The workbench must render a recent-sessions section showing persisted recent-session snapshots when available.
- Invalid form input or typed app errors must render back into the workbench as user-visible alerts instead of raw JSON.

## Runtime Behavior

- The workbench must stay server-rendered by default rather than depending on client-side state management.
- HTML action routes must stay thin adapters over existing typed app messages and results.
- The home screen model must be assembled by a dedicated UI agent module instead of being hand-built inside the route or view layer.
- The intent clarification path must reuse the same stored workflow state used by the JSON clarification endpoint.
- The workbench must make the semantic-foraging intent taxonomy visible instead of collapsing back to generic search/create/explain labels.
- Completed intent submissions must feed the same recent-session view shown on the workbench without requiring client-side state management.
- The first map slice must remain useful as rendered HTML without requiring a browser-side map runtime.
- The physical-map slice may enhance the browser surface with provider-backed basemap tiles and public geodata overlays, with OpenStreetMap available as the default no-key basemap while server-rendered fallback content remains available when browser enhancement cannot run.
- The map panel may expose an explicit current-location control that asks the browser for permission and re-orients the interactive map without sending live coordinates back through the app bus.
- The explanation workbench must split multiline facts input into grounded fact strings before dispatching the typed explanation query.

## Regression Guardrails

- The workbench must remain usable in no-model mode.
- The workbench must not fork business logic away from the existing command and query paths.
- The view layer must continue rendering from typed screen models rather than route-local strings or ad hoc JSON parsing in the browser.
