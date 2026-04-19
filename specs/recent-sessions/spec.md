# Feature: Recent Sessions

## Summary

Completed foraging intents are persisted as lightweight recent-session snapshots so contributors can inspect session history and give the `resume-session` path real stored state to target.

## Contract

- Completed intent submissions must write a recent-session snapshot through the storage boundary.
- A recent-session snapshot must include:
  - `sessionId`
  - `input`
  - `title`
  - `summary`
  - `sourceIntent`
  - `cues`
  - `savedAt`
- The home screen must render a recent-sessions section that lists the newest stored sessions first.

## Runtime Behavior

- Recent-session persistence must stay behind the repository boundary rather than moving writes into routes or views.
- Awaiting-clarification workflows must not create recent-session snapshots yet.
- Recent-session load failures in the home-screen render path should degrade gracefully into an empty list plus a user-visible informational alert.
- Recent-session write failures in completed intent flows must return the typed `storage_failure` app error category.
- Resume-session retrieval should use persisted recent sessions when available instead of falling back immediately to static demo data.

## Regression Guardrails

- The initial recent-session implementation must remain in-memory and process-local.
- Session summaries must stay deterministic and derive from the classified intent plus extracted cues.
- The home page must remain usable when no recent sessions exist.
