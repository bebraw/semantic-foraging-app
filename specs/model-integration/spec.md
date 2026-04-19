# Spec: Model Integration

## Status

Draft

## Summary

Add a typed model integration layer to the application.

The model layer must:

- support a local OpenAI-compatible inference provider for development
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

### FR-3 Local development path

The app must support a local OpenAI-compatible chat-completions endpoint for development use cases such as Ollama or LM Studio.

If local provider configuration is present, the resolver may prefer that path over managed Cloudflare providers so contributors can opt into local inference explicitly.

### FR-4 Safe fallback

If the model is unavailable, its availability check fails, or it returns invalid output:

- the request must still complete
- the app must render deterministic fallback UI
- no invalid model output may enter domain logic

### FR-5 Typed outputs

All structured model outputs must be schema-validated before use.
Schema validation failures must fall back deterministically instead of being treated as accepted model output.

### FR-6 Capability detection

The provider must expose capabilities so the app can decide whether to:

- request structured output
- request plain text
- skip inference entirely

### FR-7 Route isolation

Route handlers must not call Cloudflare AI APIs directly.
All model access must flow through `src/infra/llm/`.

### FR-8 Provenance reporting

Model-assisted results must expose whether the final output came from:

- model-backed inference
- deterministic fallback behavior
- enough provenance detail to distinguish inference failures from schema-validation fallback

### FR-9 Runtime capability exposure

The app must be able to expose the active runtime tier and capability summary through typed app results so shell rendering and generic app queries can report whether the app is running in no-model, local-model, or hosted-model mode.

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
- An `OpenAiCompatibleProvider` exists
- A `CloudflareWorkersAiProvider` exists
- A `CloudflareAiGatewayProvider` exists
- A provider resolver selects the configured provider
- The active runtime capability can be queried through typed app-layer results
- At least one end-to-end use case uses the model layer
- Model failures are covered by tests
- The app remains usable with inference disabled
