# ADR: Keep live map location client-side

## Status

Accepted

## Context

The map now supports a real browser basemap, which makes it useful to orient the view around the user's current location.

That introduces a sensitive boundary:

- live coordinates are more sensitive than the existing deterministic lead geometry
- the workbench does not need persisted or server-side location to re-center the map
- routing live coordinates through the Worker would widen the logging, persistence, and test surface unnecessarily

## Decision

When the user asks the map to use their current location:

- the browser may request geolocation permission directly
- live coordinates must stay client-side
- the browser may re-center the map and render a current-location marker locally
- the Worker must not receive, persist, or log the live coordinates as part of this feature

The server still owns basemap configuration, candidate geometry, overlay membership, and the default viewport.

## Consequences

### Positive

- The map can orient to the user's position without expanding server-side handling of sensitive location data.
- Permission prompts stay explicit and user-driven in the browser.
- The feature remains compatible with the existing server-rendered screen-model architecture.

### Negative

- Current-location orientation is not available in pure server-rendered fallback mode.
- Browser tests need explicit geolocation permission setup.

### Neutral

- The map now has one small client-only state fragment for ephemeral orientation, while the rest of the map remains server-owned.
