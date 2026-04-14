# Feature: Intent API

## Summary

The app exposes small JSON command endpoints for classifying a user request into a bounded set of supported intents and continuing a clarification step when the first request is ambiguous.

## Contract

- `POST /api/intent` accepts JSON with:
  - `input: string`
- `POST /api/intent/clarify` accepts JSON with:
  - `workflowId: string`
  - `clarification: string`
- successful responses return JSON with:
  - `ok: true`
  - `input: string`
  - `classification.intent`
  - `classification.confidence`
  - `classification.needsClarification`
  - `confidenceBand`
  - `provenance.source`
  - `provenance.provider`
  - `provenance.reason`
  - `workflow.name`
  - `workflow.state`
- successful responses also include stable request-trace headers
- clarification-required responses additionally return:
  - `workflow.workflowId`
  - `workflow.question`
  - `workflow.options`
- invalid request bodies return:
  - HTTP `400`
  - `ok: false`
  - `category: "validation_error"`
  - a stable validation error message
- missing clarification workflow state returns:
  - HTTP `404`
  - `ok: false`
  - `category: "unsupported_workflow_transition"`
  - a stable workflow-transition error message
- workflow repository read or write failures return:
  - HTTP `503`
  - `ok: false`
  - `category: "storage_failure"`
  - a stable storage error message

## Runtime Behavior

- The route must translate HTTP input into a typed app command.
- The app bus must dispatch that command through a bounded use case.
- Intent classification must use the shared model-provider boundary when available.
- If no model provider is configured or inference fails, the route must still return deterministic classification output.
- Responses must expose whether classification came from deterministic fallback logic or model-backed inference.
- Ambiguous input must return an explicit workflow state instead of an implicit retry expectation.
- The clarification route must continue the same bounded workflow using the original input plus the follow-up clarification text.
- The clarification route must reload the original input from stored workflow state keyed by `workflowId`.
- Route handlers must translate typed app errors into the stable JSON error payload without inventing route-local categories.

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
