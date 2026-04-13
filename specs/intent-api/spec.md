# Feature: Intent API

## Summary

The app exposes small JSON command endpoints for classifying a user request into a bounded set of supported intents and continuing a clarification step when the first request is ambiguous.

## Contract

- `POST /api/intent` accepts JSON with:
  - `input: string`
- `POST /api/intent/clarify` accepts JSON with:
  - `input: string`
  - `clarification: string`
- successful responses return JSON with:
  - `ok: true`
  - `input: string`
  - `classification.intent`
  - `classification.confidence`
  - `classification.needsClarification`
  - `workflow.name`
  - `workflow.state`
- clarification-required responses additionally return:
  - `workflow.question`
  - `workflow.options`
- invalid request bodies return:
  - HTTP `400`
  - `ok: false`
  - a stable validation error message

## Runtime Behavior

- The route must translate HTTP input into a typed app command.
- The app bus must dispatch that command through a bounded use case.
- Intent classification must use the shared model-provider boundary when available.
- If no model provider is configured or inference fails, the route must still return deterministic classification output.
- Ambiguous input must return an explicit workflow state instead of an implicit retry expectation.
- The clarification route must continue the same bounded workflow using the original input plus the follow-up clarification text.

## Supported Intents

- `search`
- `create`
- `explain`
- `clarify`

## Regression Guardrails

- The no-model path must stay functional.
- Route handlers must not call provider-specific APIs directly.
- The response shape must stay stable enough for request-driven tests.
- Workflow state must stay serializable and client-roundtrippable.
