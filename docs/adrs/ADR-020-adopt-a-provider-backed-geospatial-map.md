# ADR: Adopt a provider-backed geospatial map

## Status

Accepted

## Context

The current map slice projects candidate leads and recent sessions into an abstract terrain frame with deterministic pseudo-coordinates.

That was useful for validating the screen-model boundary, but it falls short of the product direction:

- foraging leads need to relate to real terrain and public geospatial context
- map rendering should be able to use Finnish base-map and observation data without moving application truth into the browser
- provider credentials and external-service variability must not break the no-key local baseline of the repo

The next map slice therefore needs to support real geospatial data while preserving the existing server-first architecture.

## Decision

We will evolve the map feature into a provider-backed geospatial surface:

- map contracts will use real geographic coordinates and geometries instead of abstract percentage anchors
- the server will own provider configuration and overlay selection
- the browser map will render from typed screen-model data and optional thin JSON overlay endpoints
- the first physical-map integration will target Finnish public geodata, starting with:
  - OpenStreetMap standard raster tiles as the default no-key basemap
  - National Land Survey of Finland (NLS) as an opt-in Finnish topographic basemap
  - FinBIF for species occurrence overlays
  - optional SYKE and Finnish Forest Centre layers as later overlays
- missing credentials or unavailable providers must degrade to a server-rendered physical fallback instead of breaking the workbench

## Trigger

The abstract map fragment and its enhancement layer are now implemented, which makes the lack of real coordinates and public geodata the main architectural gap.

## Consequences

**Positive:**

- The workbench can move from abstract “lead cards on a frame” to geographically meaningful terrain context.
- External geodata usage becomes explicit and testable through typed contracts and provider boundaries.
- The no-key local baseline can now open a real interactive basemap without requiring project-specific map credentials.
- Browser interactivity stays subordinate to server-owned map and overlay configuration.

**Negative:**

- The map contracts, tests, and rendering logic become more complex.
- External providers introduce API keys, licences, and uptime constraints that must be surfaced in fallback behavior.
- Defaulting to community-hosted OSM raster tiles means the project must keep visible attribution, avoid prefetch behavior, and remain ready to switch providers if usage grows.

**Neutral:**

- The map feature now spans domain, infrastructure, and view concerns rather than living only inside the UI agent and renderer.

## Alternatives Considered

### Keep the deterministic abstract map as the long-term map surface

Rejected because it cannot express physical terrain, real coordinates, or external public datasets in a way that supports actual foraging use cases.

### Let the browser own the map state and fetch providers directly

Rejected because it would bypass the existing typed screen-model boundary, expose provider details too widely, and make fallback behavior harder to reason about.
