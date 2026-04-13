# Feature: Intent API

## Summary

The app exposes a small JSON command endpoint for classifying a user request into a bounded set of supported intents.

## Contract

- `POST /api/intent` accepts JSON with:
  - `input: string`
- successful responses return JSON with:
  - `ok: true`
  - `input: string`
  - `classification.intent`
  - `classification.confidence`
  - `classification.needsClarification`
- invalid request bodies return:
  - HTTP `400`
  - `ok: false`
  - a stable validation error message

## Runtime Behavior

- The route must translate HTTP input into a typed app command.
- The app bus must dispatch that command through a bounded use case.
- Intent classification must use the shared model-provider boundary when available.
- If no model provider is configured or inference fails, the route must still return deterministic classification output.

## Supported Intents

- `search`
- `create`
- `explain`
- `clarify`

## Regression Guardrails

- The no-model path must stay functional.
- Route handlers must not call provider-specific APIs directly.
- The response shape must stay stable enough for request-driven tests.
