# ADR: Add a local OpenAI-compatible model path

## Status

Accepted

## Context

The repo already has a shared model-provider boundary plus Cloudflare-native providers for Workers AI and AI Gateway.

That covers the managed deployment path, but it still falls short of the architecture goal in `docs/architecture.md`: core model-backed behavior should also work against a local model runtime without requiring an external API key.

For local development, the most credible lightweight options are runtimes such as Ollama and LM Studio that expose OpenAI-compatible chat endpoints on localhost.

## Decision

We will add a local OpenAI-compatible provider path:

- `src/infra/llm/providers/openai-compatible.ts` implements a small chat-completions client for local OpenAI-compatible runtimes
- the provider is selected when `LOCAL_MODEL_BASE_URL` and `LOCAL_MODEL_NAME` are configured
- the resolver prefers the local provider over Cloudflare bindings so local development can opt in explicitly
- `LOCAL_MODEL_API_KEY` remains optional for runtimes that ignore auth locally

## Consequences

### Positive

- The app can use local model inference during development without depending on Cloudflare bindings or third-party API keys.
- Ollama and LM Studio can share the same provider boundary instead of adding runtime-specific branches to app code.
- Existing deterministic fallbacks and provenance behavior remain unchanged because callers still depend on the same `ModelProvider` interface.

### Negative

- The provider now assumes OpenAI-compatible structured-output support for the local runtime family we document.
- Provider-selection precedence becomes slightly more complex because explicit local configuration overrides the managed Cloudflare path.

## Rejected alternatives

### Add separate Ollama and LM Studio providers

Rejected because both runtimes expose the same OpenAI-compatible surface needed for this slice, so separate adapters would add maintenance cost without new app-level capability.

### Keep local development on deterministic fallback only

Rejected because it leaves the local-model architecture goal partially unimplemented and weakens the shared model boundary in the environment where contributors iterate most often.
