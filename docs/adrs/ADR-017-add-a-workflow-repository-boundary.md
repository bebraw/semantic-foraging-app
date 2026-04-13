# ADR: Add a workflow repository boundary

## Status

Accepted

## Context

The repo now has a bounded multi-step intent clarification flow, but until now the second step relied on the client resubmitting the original input alongside the clarification text.

That approach kept the slice small, but it left the storage layer described in `docs/architecture.md` unimplemented and kept short-lived workflow state outside the app boundary. It also made the continuation step trust client replay of state that the app had already computed.

The template still needs to stay lightweight and avoid committing to a durable storage system too early.

## Decision

We will add a small workflow repository boundary:

- `src/infra/storage/repository.ts` defines the repository contract
- `src/infra/storage/memory-store.ts` provides a lightweight in-memory implementation
- the intent clarification flow stores `awaiting_clarification` snapshots under a generated `workflowId`
- the clarification continuation step reloads stored state by `workflowId` instead of relying on replayed raw input

## Consequences

### Positive

- Workflow state now lives behind an explicit storage boundary instead of leaking into the client contract.
- Future durable storage work has a narrower seam to replace.
- The clarification continuation step becomes more trustworthy because it reloads app-owned state.

### Negative

- The first storage implementation is still process-local and non-durable.
- The app now owns one more cross-request concern that tests and documentation need to preserve.

## Rejected alternatives

### Keep replaying the original input from the client

Rejected because it avoids the storage layer rather than implementing it and makes the continuation step trust client-supplied state the app already knows.

### Introduce durable storage immediately

Rejected because the template should add the storage boundary first before choosing a heavier or platform-specific persistence mechanism.
