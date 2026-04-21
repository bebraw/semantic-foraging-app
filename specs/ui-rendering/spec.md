# Feature: UI Rendering

## Summary

The app represents rendered UI as typed screen models between the app layer and the view layer, and it can also return those screen models directly through a small JSON query surface.

## Contract

- Screen models must remain typed application data rather than raw HTML.
- `POST /api/app/query` accepts `type: "RenderHomeScreen"` for the home-screen query shape
- successful responses return JSON with:
  - `ok: true`
  - `type: "RenderHomeScreen"`
  - `screen.kind`
  - `screen.title`
  - `screen.searchPrompt`
  - `screen.presentation.primaryKind`
  - `screen.runtime.mode`
  - `screen.runtime.available`
  - `screen.routes`
  - `screen.meta.traceId`
- invalid request bodies return:
  - HTTP `400`
  - `ok: false`
  - `category: "validation_error"`
  - a stable validation error message

## Runtime Behavior

- The home page HTML path must render from the same `HomeScreenModel` contract returned by the app query endpoint.
- The app query route must stay a thin adapter over typed app messages and results.
- Screen models may include lightweight developer-facing metadata such as the active trace ID.
- Screen models may expose runtime capability details when that data helps contributors understand the current model tier without inspecting environment variables directly.
- The server-rendered home page should not foreground developer-facing route catalogs, runtime summaries, or visible trace ids; those details may remain in typed screen data and JSON surfaces without becoming primary UI content.
- The default home-screen presentation should stay visually restrained: white-canvas surfaces, border-led grouping, restrained accent color, and minimal decorative effects so the UI remains easy to reuse and prune.
- The home screen model may include typed search-prompt and semantic-presentation fragments so query-shape decisions stay outside the HTML templates.
- The home screen model may include typed manual-workbench fragments for semantic foraging flows such as clarification, artifact reuse, and explanation drafting even when those fragments are not the primary surface.
- The home screen model may include typed map fragments when spatial projection helps contributors inspect current retrieval state.
- Typed map fragments may include provider-backed basemap and overlay configuration, but those details must still flow through the screen model instead of being hidden inside view-only code.
- View-specific browser enhancement may attach to server-rendered screen fragments, but it must operate only on typed data already present in the rendered screen model.
- In-place browser view switches should restore focus to the updated result heading and announce the change through a live region.
- When provider-backed map tiles are available, the rendered home screen may serialize typed map state into the HTML so lightweight browser code can project overlays on top of the configured basemap.
- Typed map fragments may include browser-only location-control copy so the rendered UI can ask for geolocation permission without inventing ad hoc text or policy in the script layer.
- External browser libraries such as Leaflet may render typed map fragments, but they must be fed only by server-owned screen data and locally served pinned assets.

## Regression Guardrails

- The screen model shape for the home page must stay stable enough for request-driven tests.
- Rendering helpers must not reintroduce business logic into HTML assembly.
- The no-model path must still support both HTML rendering and JSON screen-model queries.
- Client-side enhancement must not become an alternate application-state or retrieval pipeline.
- Screen rendering must preserve a meaningful physical-map fallback when external geodata providers are missing or disabled.
