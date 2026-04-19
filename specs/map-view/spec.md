# Feature: Map View

## Summary

The home screen includes a typed map fragment that can project candidate leads and recent sessions onto a physical map using provider-backed geospatial data while remaining usable in a server-rendered fallback UI.

## Contract

- The home screen model may include a `mapView` fragment.
- A map view must include:
  - `title`
  - `description`
  - `emptyState`
  - `legendTitle`
  - typed `viewport`
  - typed `basemap`
  - typed `features`
- Each map feature must include:
  - `id`
  - `label`
  - `kind`
  - `summary`
  - `evidenceSummary`
  - `sourceSection`
  - typed geometry
- Map geometry must represent real geographic coordinates rather than abstract screen percentages.
- A provider-backed map view may include typed overlay sources for external occurrence or environmental layers.
- A map view may include typed browser-location controls that describe how the UI asks for and reports current-location orientation.

## Runtime Behavior

- The map view must be assembled from typed application data rather than from ad hoc HTML-only calculations.
- The first slice must stay server-rendered and useful without any client-side enhancement.
- Later interaction may progressively enhance the same server-rendered fragment, and when a basemap provider is configured the browser may render physical map tiles plus projected typed overlays from server-provided map state.
- Candidate leads and recent sessions may degrade into a simplified physical fallback panel when basemap or overlay providers are unavailable.
- Basemap provider configuration must be resolved on the server and exposed to the view through typed screen data.
- OpenStreetMap standard tiles may act as the default no-key basemap as long as the rendered map keeps visible attribution and the browser enhancement stays limited to normal interactive viewing.
- Real observation overlays must come through an explicit provider boundary rather than being hard-coded in the view.
- Geometry generation and fallback behavior must remain deterministic enough for request-driven tests to validate the fragment reliably.
- When map features exist, the rendered fragment may include a focused-detail panel plus lightweight browser behavior that updates that panel from typed data attributes already present in the markup.
- The browser enhancement may ask for geolocation permission only after an explicit user action and may use that result to re-center the interactive map locally.

## Regression Guardrails

- The map view must not become a client-side source of truth for retrieval or ranking.
- The map fragment must degrade gracefully into an empty-state panel when no leads are available.
- The view layer must only render map geometry and legend data that the screen model already contains.
- Browser enhancement must not fetch, invent, or reorder map features independently of the screen model.
- Browser enhancement may fetch provider-owned basemap tiles referenced by the typed screen model, but feature geometry and overlay membership must still come from the server-owned screen data.
- Live user coordinates must not be posted back to the Worker, persisted in session state, or logged as part of map orientation.
- Provider credentials must not be required for the baseline no-model development path.
- Sensitive or restricted occurrence data must not be exposed through public map overlays by default.
