# ADR: Add a saved-artifact boundary

## Status

Accepted

## Context

The current workbench can classify a task, retrieve deterministic candidate cards, explain why a candidate surfaced, and persist lightweight recent sessions.

That is enough to inspect the product loop, but not enough to complete it. The architecture in `docs/architecture.md` expects the user to be able to save, refine, or continue a trail. Recent sessions preserve activity history, but they are not user-owned artifacts such as field notes, saved trails, or patch inspections.

The repo still needs to stay lightweight and avoid choosing a durable storage backend before the shape of saved artifact data is clear.

## Decision

We will add a small saved-artifact boundary:

- `src/domain/contracts/artifact.ts` defines the serializable saved-artifact contract
- `src/infra/storage/repository.ts` defines a saved-artifact repository contract alongside the existing workflow and recent-session boundaries
- the first slice will support saving bounded artifacts derived from candidate cards rather than broad freeform authoring

## Trigger

Recent sessions and retrieval evidence are already implemented, which makes user-owned saved artifacts the main missing step in the product spine.

## Consequences

**Positive:**

- The roadmap can move from inspectable retrieval to durable foraging state without bypassing the app boundary.
- Future storage work gets an explicit seam before choosing Cloudflare-specific or database-specific persistence.
- UI and app flows can talk about saved artifacts as a first-class concept instead of overloading recent sessions.

**Negative:**

- The storage layer gains another serializable contract that tests and docs must preserve.
- The first artifact slice will still be process-local and non-durable across restarts.

## Alternatives Considered

### Reuse recent sessions as saved artifacts

Rejected because recent sessions describe completed interactions, not durable user-owned field notes or saved trails.

### Add durable storage first and design the artifact shape later

Rejected because the template should lock the contract and boundary first, then choose heavier persistence only when the slice proves useful.
