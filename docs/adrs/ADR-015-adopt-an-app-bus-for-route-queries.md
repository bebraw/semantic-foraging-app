# ADR: Adopt an application bus for route-level queries

## Status

Accepted

## Context

The starter Worker currently has clean separation between API and view helpers, but the top-level route handling still wires HTTP requests directly to response creation logic.

The architecture draft in `docs/architecture.md` calls for:

- route handlers that translate HTTP into typed application messages
- a small in-process application bus
- typed application outputs that can become HTML or JSON

Without that layer, future domain agents and workflow modules would need to attach themselves directly to the Worker router or view code. That would make the architecture document aspirational instead of executable.

## Decision

We will introduce a small application layer for route-level query handling:

- `src/app/message.ts` defines typed application messages
- `src/app/bus.ts` dispatches those messages in-process
- `src/app/use-cases/` handles bounded application queries
- `src/domain/contracts/` defines typed screen and result models
- `src/api/app-query.ts` adapts app-layer results back into HTTP responses

The first slice routes the existing home page and health endpoint through that app bus while preserving the current user-facing behavior.

## Consequences

### Positive

- Route handling now follows the documented message-oriented shape.
- The home screen is produced from a typed screen model rather than route-local string assembly inputs.
- Future workflow or domain modules can plug into the app layer without overloading `src/worker.ts`.

### Negative

- The starter adds several small files before they are all heavily used.
- There is one more layer to understand when tracing a request.

## Rejected alternatives

### Keep direct route-to-response wiring in `src/worker.ts`

Rejected because it keeps the architecture document disconnected from the running code.

### Introduce a heavyweight agent runtime now

Rejected because the template should stay lightweight, explicit, and easy to test.
