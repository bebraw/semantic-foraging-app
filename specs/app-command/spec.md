# Feature: App Command API

## Summary

The app exposes a generic JSON command endpoint for submitting typed app commands without binding clients to narrower route-specific adapters.

## Contract

- `POST /api/app/command` accepts JSON in one of these shapes:
  - `type: "SubmitUserIntent"` with `input: string`
  - `type: "ClarifyUserIntent"` with `workflowId: string` and `clarification: string`
- successful intent-related responses return the same payload shape as the intent-specific command endpoints
- invalid request bodies return:
  - HTTP `400`
  - `ok: false`
  - a stable validation error message

## Runtime Behavior

- The generic command route must remain a thin adapter over typed app messages.
- The route may reuse existing command use cases and response shaping helpers instead of duplicating business logic.
- Missing workflow state for clarification commands must return the same stable `404` error as the narrow clarification endpoint.

## Regression Guardrails

- The no-model path must stay functional through the generic command endpoint.
- The route must not bypass the app bus or route handlers’ validation boundaries.
- The generic command surface must not silently drift from the behavior of the narrower intent command routes it wraps.
