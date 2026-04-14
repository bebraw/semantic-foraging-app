# Spec: Model Integration

## Status

Draft

## Summary

Add a typed model integration layer to the application.

The model layer must:

- support Cloudflare Workers AI as the default managed inference provider
- support Cloudflare AI Gateway in front of Workers AI
- hide provider details behind a shared `ModelProvider` contract
- fail safely to deterministic behavior when inference is unavailable
- keep all truth-bearing workflow and domain validation outside the model

## Motivation

The application needs bounded model assistance for:

- intent classification
- explanation generation
- clarification drafting
- small text transformations

The application must not depend on:

- a monolithic agent framework
- direct provider-specific code in route handlers
- end-user managed API keys
- model output being trusted without validation

## Goals

- Server-first integration that fits Cloudflare Workers
- Typed model provider boundary
- Safe default deployment path on Cloudflare
- Deterministic fallback behavior
- Clear observability for model usage

## Non-goals

- Building the whole app around Cloudflare Agents
- Letting model output directly define domain state
- Long autonomous loops
- General-purpose tool-using agent runtime in v1
- End-user BYOK flow

## Functional requirements

### FR-1 Provider abstraction

The app must expose a single provider contract for model access.

### FR-2 Default Cloudflare path

The default production provider must be:

- Workers AI for inference
- AI Gateway for control and observability

### FR-3 Safe fallback

If the model is unavailable, its availability check fails, or it returns invalid output:

- the request must still complete
- the app must render deterministic fallback UI
- no invalid model output may enter domain logic

### FR-4 Typed outputs

All structured model outputs must be schema-validated before use.

### FR-5 Capability detection

The provider must expose capabilities so the app can decide whether to:

- request structured output
- request plain text
- skip inference entirely

### FR-6 Route isolation

Route handlers must not call Cloudflare AI APIs directly.
All model access must flow through `src/infra/llm/`.

### FR-7 Provenance reporting

Model-assisted results must expose whether the final output came from:

- model-backed inference
- deterministic fallback behavior

## User stories

### US-1 Intent assistance

As a user,
when I submit ambiguous text,
the app can classify it into a small set of supported intents.

### US-2 Explanation assistance

As a user,
when the system makes a suggestion,
the app can explain it in natural language.

### US-3 Graceful degradation

As a user,
if model inference fails,
the app still works using deterministic UI and rules.

## Acceptance criteria

- A typed `ModelProvider` interface exists
- A `CloudflareWorkersAiProvider` exists
- A `CloudflareAiGatewayProvider` exists
- A provider resolver selects the configured provider
- At least one end-to-end use case uses the model layer
- Model failures are covered by tests
- The app remains usable with inference disabled
