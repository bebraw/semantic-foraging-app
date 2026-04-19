# ADR: Add a UI-agent-driven foraging workbench

## Status

Accepted

## Context

The repo already had typed app messages, query and command surfaces, and a screen-model boundary, but the HTML shell was still mostly a static starter page.

That left an important gap:

- the architecture document called for a UI agent
- the screen model did not yet drive a realistic manual user flow
- contributors could not test the bounded intent, clarification, and explanation paths end to end from the browser without dropping to JSON requests

The semantic-foraging architecture also needs to stop reading like a generic starter and start expressing the actual product loop it exists to support.

## Decision

We will add a UI-agent-driven foraging workbench:

- `src/domain/agents/ui-agent.ts` owns the home/workbench screen-model assembly
- `GET /` renders a server-first foraging workbench instead of a static starter page
- `POST /actions/intent`, `POST /actions/intent/clarify`, and `POST /actions/explanation` provide HTML action adapters that reuse the existing typed app bus
- action outcomes render back into the same typed workbench screen model with alerts, workflow prompts, and result summaries

## Consequences

### Positive

- Contributors can exercise the current semantic-foraging flow manually in a browser.
- UI composition logic now lives in a dedicated module instead of accumulating in use cases or views.
- The architecture becomes more concrete because the screen model now carries real interaction fragments, not just decorative shell copy.

### Negative

- The home screen contract becomes larger and more feature-specific.
- The app now maintains both JSON adapters and HTML action adapters over the same underlying flows.

## Rejected alternatives

### Keep the home page as a static shell and rely on JSON tools for manual testing

Rejected because it leaves the UI-agent portion unimplemented and makes the architecture harder to validate by hand.

### Build the workbench as a client-side SPA first

Rejected because the architecture explicitly prefers server-rendered HTML as the default UI model, with JSON endpoints supporting enhancement rather than replacing the app shell.
