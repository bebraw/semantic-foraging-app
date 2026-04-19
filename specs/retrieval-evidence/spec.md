# Feature: Retrieval Evidence

## Summary

Completed semantic-foraging intents surface deterministic candidate cards with explicit evidence notes so retrieval behavior is inspectable before durable storage or model-assisted ranking exists.

## Contract

- The home screen model may include bounded candidate cards after a completed intent submission.
- Candidate cards must use explicit kinds from the current retrieval slice:
  - `observation`
  - `field-note`
  - `patch`
  - `trail`
  - `session`
- Each candidate card must include:
  - `title`
  - `summary`
  - `statusLabel`
  - one or more evidence notes with `label` and `detail`
- Awaiting-clarification workflows must not surface candidate cards yet.

## Runtime Behavior

- Candidate cards must be assembled by a dedicated knowledge agent module instead of route-local logic or view templates.
- Ranking must remain deterministic and driven by the classified intent plus extracted species, habitat, region, and season cues.
- Evidence notes must explain why a candidate was surfaced, such as intent fit, cue overlap, or remaining missing context.
- The create-field-note intent must surface a draft note scaffold plus nearby contextual leads instead of returning an empty retrieval state.

## Regression Guardrails

- Retrieval cards must remain inspectable in no-model mode.
- View rendering must not invent evidence text that the knowledge agent did not return.
- The current slice must stay lightweight and in-memory rather than introducing durable retrieval storage or background indexing.
