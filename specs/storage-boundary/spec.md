# Feature: Storage Boundary

## Summary

The app exposes a small repository boundary for workflow-state persistence so bounded workflows can span multiple HTTP requests without moving storage concerns into routes or domain agents directly.

## First Implementation Slice

- `src/infra/storage/repository.ts` defines the workflow repository contract
- `src/infra/storage/memory-store.ts` provides an in-memory implementation
- the intent clarification workflow stores and reloads `awaiting_clarification` snapshots through that boundary

## Runtime Behavior

- Storage access must remain isolated under `src/infra/storage/`.
- App use cases may depend on the repository contract through `AppContext`, but routes must not manipulate storage directly.
- The initial implementation uses process-local in-memory storage and is not durable across Worker restarts.

## Regression Guardrails

- The repository boundary must stay easy to swap for a more durable backend later.
- Workflow state must remain serializable when written to the repository.
- Missing workflow snapshots must fail with a stable API error instead of implicit fallback behavior.
- Missing workflow snapshots must map to the typed `unsupported_workflow_transition` app error category.
- Repository read or write failures must map to the typed `storage_failure` app error category instead of escaping as untyped exceptions.
