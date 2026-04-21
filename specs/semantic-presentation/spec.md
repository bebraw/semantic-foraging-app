# Feature: Semantic Presentation

## Summary

The home page is a search-first semantic-foraging surface that maps each query to a typed primary result presentation instead of always rendering the same fixed panel stack.

## Contract

- The typed home screen model must expose:
  - a search prompt with the action path, field metadata, and example queries
  - a semantic presentation model with:
    - a `primaryKind`
    - component-selection signals
    - typed component metadata for the available presentation options
- The supported primary presentation kinds are:
  - `empty`
  - `clarification`
  - `map`
  - `cards`
  - `table`
  - `prose`
- Explicit view requests in the query such as `table`, `map`, `cards`, or `prose` must bias the primary presentation toward that component when relevant data exists.
- The component controls rendered with the available presentation options must navigate to the same search using a browser `view` query parameter and apply that explicit presentation override when relevant data exists.
- When the query emphasizes proximity or spots and mappable results exist, the primary presentation should prefer `map`.
- When the query asks what is available or what kinds exist, the primary presentation should prefer `cards`.
- When the query asks for comparison, prevalence, or ranking, the primary presentation should prefer `table`.
- When the query reads primarily as explanation, the primary presentation should prefer `prose`.

## Runtime Behavior

- Presentation selection must happen before the HTML view layer so the same decision remains visible through the JSON screen-model query route.
- The home page should keep the primary surface minimal and search-led, while saved artifacts, recent sessions, and explanation drafting remain secondary support surfaces.
- Component metadata must stay explicit enough that a contributor can inspect why the UI chose one presentation over another.
- Debug-oriented presentation metadata should be hidden by default in the HTML UI and only revealed through an explicit foldable sidebar toggle.
- The semantic mapping layer may use deterministic heuristics today, but the contract should remain typed so the mapping strategy can evolve later without hiding behavior in templates.

## Regression Guardrails

- Presentation selection must not fork retrieval truth away from the existing typed app flow.
- A browser-only enhancement may enrich a chosen component such as `map`, but it must not become the source of truth for the presentation choice.
- Explicit view requests must not silently disappear when a compatible result shape can be built from available data.
