# Feature: App Query API

## Summary

The app exposes a generic JSON query endpoint for dispatching typed app queries without binding clients to narrow route-specific adapters.

## Contract

- `POST /api/app/query` accepts JSON in one of these shapes:
  - `type: "RunHealthCheck"`
  - `type: "RenderHomeScreen"`
  - `type: "RequestExplanation"` with `title: string` and `facts: string[]`
- successful responses return JSON with:
  - `ok: true`
  - `type`
- `RunHealthCheck` responses additionally return:
  - `name: string`
  - `routes: string[]`
- `RenderHomeScreen` responses additionally return:
  - `screen.kind`
  - `screen.title`
  - `screen.routes`
  - `screen.meta.traceId`
- `RequestExplanation` responses additionally return:
  - `title: string`
  - `facts: string[]`
  - `explanation: string`
  - `provenance.source`
  - `provenance.provider`
  - `provenance.reason`
- invalid request bodies return:
  - HTTP `400`
  - `ok: false`
  - `category: "validation_error"`
  - a stable validation error message

## Runtime Behavior

- The generic query route must remain a thin adapter over typed app messages.
- The route may reuse existing query use cases and response shaping helpers instead of duplicating business logic.
- Narrow query routes such as `GET /api/health` and `POST /api/explanation` may remain as compatibility adapters, but they must dispatch through the same app-layer query path.

## Regression Guardrails

- The no-model path must stay functional through the generic query endpoint.
- The generic query surface must not silently drift from the behavior of the narrower query routes it overlaps.
- The response discriminator must stay stable enough for request-driven tests.
