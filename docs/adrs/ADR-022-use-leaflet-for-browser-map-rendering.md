# ADR: Use Leaflet for browser map rendering

## Status

Accepted

## Context

The map feature already has typed server-owned geospatial data, a no-key basemap default, and browser-only current-location orientation.

The remaining client runtime was still hand-built:

- tile loading, vector rendering, and zoom behavior lived inside a custom inline script
- map interactivity was increasingly map-library-shaped without getting the benefits of a tested map runtime
- future work such as layer toggles, popups, and richer viewport behavior would be easier on a standard browser map abstraction

## Decision

The browser map runtime will use Leaflet on the client.

- The Worker still owns basemap selection, typed feature geometry, overlays, and default viewport data.
- The browser receives Leaflet as a pinned local asset served by the Worker instead of a CDN dependency.
- Leaflet will render the tile layer plus typed point, trail, area, overlay, and current-location layers.
- The server-rendered fallback map remains in place for no-JS or failed-JS cases.

## Consequences

### Positive

- The client map now uses a mature interaction and layer model instead of custom tile math.
- Future browser-side map enhancements can build on a standard library without changing server-owned map contracts.
- Local asset serving keeps the runtime pinned to the repo instead of depending on external CDN availability.

### Negative

- The project adds a new third-party browser dependency and asset-serving path.
- Generated local asset modules now include Leaflet CSS and JavaScript for Worker-runtime compatibility.

### Neutral

- The browser map remains progressive enhancement only; Leaflet does not become a source of truth for retrieval, ranking, or persisted state.
