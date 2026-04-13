# ADR: Add lightweight request tracing

## Status

Accepted

## Context

The repo now routes multiple HTML and JSON flows through a small app bus, a model-provider boundary, and the first bounded workflow state machine.

That architecture is intentionally explicit, but it also creates a new failure mode: requests can cross several small modules with little visibility into what happened. The architecture draft in `docs/architecture.md` already calls for lightweight tracing from day one so message chains and model usage do not become opaque.

The template still needs to stay lightweight, easy to clone, and easy to prune. Pulling in a heavier observability stack now would add more setup and maintenance than the current application slice justifies.

## Decision

We will add a minimal per-request tracing layer under `src/infra/observability/`:

- `trace.ts` creates a request trace with a stable trace ID and ordered trace events
- the app context carries that trace through app-layer execution
- the app bus records traced dispatch operations for typed app messages
- model providers are wrapped so model availability checks and completions are traced automatically
- Worker responses include `x-trace-id` and `x-trace-events` headers for lightweight debugging

## Consequences

### Positive

- Message-oriented request flow is now inspectable without a full logging platform.
- Model usage becomes visible through the shared provider boundary instead of ad hoc route logging.
- HTML and JSON responses expose enough trace metadata for tests and local debugging.

### Negative

- The template adds another cross-cutting abstraction before storage or richer observability exists.
- Response headers now include small amounts of debugging metadata that future contributors need to preserve intentionally.

## Rejected alternatives

### Add no observability until storage or durable workflows exist

Rejected because the app bus and model boundary are already enough indirection to make failures harder to debug without request traces.

### Introduce a full external observability stack now

Rejected because it would add disproportionate setup and operational weight for a lightweight starter repository.
