# Feature: Observability

## Summary

The app captures lightweight per-request traces so message-oriented flows stay inspectable without adding a heavyweight logging stack.

## Contract

- Each request handled through `src/worker.ts` must create a trace object with:
  - a stable request trace ID
  - the matched route path
  - an ordered list of trace events
- Each HTTP response must include:
  - `x-trace-id`
  - `x-trace-events`

## Runtime Behavior

- The app bus must record traced dispatch events for typed app messages.
- Bounded use cases may add domain-specific trace notes such as intent, workflow state, or fact count.
- Model provider calls must be wrapped so model availability checks and completions are traced without leaking provider-specific code into routes.
- Trace logging must stay lightweight and avoid logging secrets or raw provider payloads.

## Regression Guardrails

- Trace capture must work in no-model mode.
- Trace headers must remain available on HTML, JSON, and not-found responses.
- Observability code must stay isolated from route and domain logic through shared helpers under `src/infra/observability/`.
