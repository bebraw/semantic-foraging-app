# Feature: Map View

## Summary

The home screen includes a typed map fragment that projects candidate leads and recent sessions into a shared terrain frame so spatial cues are visible in the server-rendered UI.

## Contract

- The home screen model may include a `mapView` fragment.
- A map view must include:
  - `title`
  - `description`
  - `emptyState`
  - `legendTitle`
  - `viewport`
  - typed `features`
- Each map feature must include:
  - `id`
  - `label`
  - `kind`
  - `summary`
  - `evidenceSummary`
  - `sourceSection`
  - typed geometry

## Runtime Behavior

- The map view must be assembled from typed application data rather than from ad hoc HTML-only calculations.
- The first slice must stay server-rendered and useful without any client-side enhancement.
- Candidate leads and recent sessions may project into an abstract terrain frame while the app lacks real geographic coordinates.
- Geometry generation must remain deterministic so request-driven tests can validate the fragment reliably.

## Regression Guardrails

- The map view must not become a client-side source of truth for retrieval or ranking.
- The map fragment must degrade gracefully into an empty-state panel when no leads are available.
- The view layer must only render map geometry and legend data that the screen model already contains.
