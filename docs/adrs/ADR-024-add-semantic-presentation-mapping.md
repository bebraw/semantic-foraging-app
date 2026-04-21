# ADR: Add semantic presentation mapping to the search surface

## Status

Accepted

## Context

The repo already had a typed UI agent, a server-rendered workbench, and deterministic candidate retrieval. That was enough to exercise the current app bus from a browser, but the page still assumed one fixed layout:

- an intent panel
- a map panel
- candidate cards
- saved artifacts
- recent sessions

That shape worked as a manual workbench, but it did not fit the product direction the app is now targeting. Semantic-foraging queries do not always want the same presentation. A request for nearby berry spots should bias toward a map. A request to understand what berries are available nearby is usually better as cards or prose. An explicit request for a table should be respected directly.

Without an explicit presentation-mapping contract, that behavior would drift into ad hoc view logic and become difficult to inspect through typed screen models.

## Decision

We will add semantic presentation mapping to the server-rendered home screen:

- the home screen model will include a typed search prompt plus typed semantic presentation metadata
- a dedicated presentation agent will map the current query, classified intent, available result data, and explicit view requests into a primary component choice
- the supported primary result components are `map`, `cards`, `table`, `prose`, plus `empty` and `clarification` states
- the screen model will expose component-selection reasons and source signals so the mapping stays inspectable in both HTML and JSON forms
- the browser home page will become search-first, while saved artifacts, recent sessions, and explanation drafting remain secondary support surfaces instead of the fixed primary shell

## Trigger

The product direction shifted from a general manual workbench toward a minimal search surface where the result presentation should adapt to the query instead of forcing every query through the same panel stack.

## Consequences

**Positive:**

- Query-shaped presentation becomes an explicit application behavior instead of hidden view glue.
- The same semantic mapping can be inspected through the typed home-screen JSON contract and the HTML surface.
- Explicit user requests such as table or map views can override the default presentation cleanly.

**Negative:**

- The home screen contract grows another typed layer that tests and docs must preserve.
- Presentation selection now depends on both intent classification and available result data, which adds another place where deterministic heuristics must stay coherent.

## Alternatives Considered

### Keep the fixed workbench layout and let the user visually ignore irrelevant panels

Rejected because it keeps the UI heavier than the product needs and leaves the view-choice problem unsolved.

### Move semantic presentation selection into client-side JavaScript

Rejected because the architecture still prefers server-first rendering and typed screen models as the source of truth.
