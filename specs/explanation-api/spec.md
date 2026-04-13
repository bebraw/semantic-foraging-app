# Feature: Explanation API

## Summary

The app exposes a small JSON query endpoint for returning grounded explanation text from structured inputs.

## Contract

- `POST /api/explanation` accepts JSON with:
  - `title: string`
  - `facts: string[]`
- successful responses return JSON with:
  - `ok: true`
  - `title: string`
  - `facts: string[]`
  - `explanation: string`
- invalid request bodies return:
  - HTTP `400`
  - `ok: false`
  - a stable validation error message

## Runtime Behavior

- The route must translate HTTP input into a typed app query.
- The app bus must dispatch that query through a bounded use case.
- Explanation generation must use the shared model-provider boundary when available.
- If no model provider is configured or inference fails, the route must still return deterministic explanation text.
- Explanation text must be grounded only in the submitted structured inputs.

## Regression Guardrails

- The no-model path must stay functional.
- Route handlers must not call provider-specific APIs directly.
- The response shape must stay stable enough for request-driven tests.
