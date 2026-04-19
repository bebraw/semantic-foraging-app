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
- The home screen model may include typed manual-workbench fragments for semantic foraging flows such as intent rehearsal, clarification, and explanation requests.
- The home screen model may include typed map fragments when spatial projection helps contributors inspect current retrieval state.
- View-specific browser enhancement may attach to server-rendered screen fragments, but it must operate only on typed data already present in the rendered screen model.

## Regression Guardrails

- The screen model shape for the home page must stay stable enough for request-driven tests.
- Rendering helpers must not reintroduce business logic into HTML assembly.
- The no-model path must still support both HTML rendering and JSON screen-model queries.
- Client-side enhancement must not become an alternate application-state or retrieval pipeline.
