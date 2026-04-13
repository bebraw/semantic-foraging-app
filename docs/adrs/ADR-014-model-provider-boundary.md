# ADR: Support model inference through a shared provider boundary

## Status

Accepted

## Context

The application runs on Cloudflare Workers and needs lightweight model support for bounded tasks such as intent classification and explanation generation.

Direct use of provider-specific APIs in route handlers would:
- spread infrastructure concerns across the codebase
- make local and cloud execution diverge
- complicate testing
- increase lock-in

Cloudflare provides Workers AI for serverless inference on its network, and AI Gateway for analytics, caching, retries, rate limiting, and model fallback. Workers AI can be accessed from Workers using bindings. AI Gateway can sit in front of Workers AI and other providers. 

## Decision

We will:
- define a shared `ModelProvider` contract
- implement Cloudflare-native providers under `src/infra/llm/providers/`
- use Workers AI as the default managed inference backend
- use AI Gateway in front of Workers AI when configured
- keep Cloudflare Agents optional and out of the core application architecture
- keep no-model fallback behavior as a first-class runtime mode

## Consequences

### Positive

- Infrastructure is isolated from app logic
- Safer migration path between providers
- Easier local testing and mocking
- Deterministic fallbacks stay possible

### Negative

- One more abstraction layer to maintain
- Need to normalize provider-specific responses
- Some platform-specific features may be hidden behind the common interface

## Rejected alternatives

### Direct model calls from routes

Rejected because it leaks infrastructure into app code.

### Cloudflare Agents as the primary architecture

Rejected because core workflow and domain rules must stay transparent and testable.

### BYOK in end-user UI

Rejected for v1 because it creates avoidable security and UX risk.