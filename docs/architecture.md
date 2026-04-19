# Kay-Style Local-LLM Architecture for `semantic-foraging-app`

## Goal

Implement a lightweight, Cloudflare-Worker-native semantic foraging application that uses many narrow, message-oriented modules instead of one monolithic orchestration loop.

The architecture must fit the constraints of this repo while using a **local model** that does **not require an external API key** for core functionality.

The architecture must fit these constraints:

- Cloudflare Worker runtime for the web app
- server-rendered HTML as the default UI model
- a small JSON API surface
- TypeScript
- lightweight repo structure
- specs and ADRs as source of truth
- strict quality gates
- no required external LLM API key for core functionality

## Current Status

The repo now has a concrete server-first semantic-foraging workbench rather than only a starter architecture slice.

What exists today:

- `src/worker.ts` routes both HTML workbench actions and JSON API endpoints through the same app layer.
- `src/app/bus.ts` dispatches typed messages for screen rendering, health checks, runtime inspection, intent submission, clarification continuation, and explanation requests.
- `src/domain/agents/intent-agent.ts` and `src/domain/agents/intent-workflow.ts` handle bounded intent classification plus one explicit clarification workflow.
- `src/domain/agents/knowledge-agent.ts` surfaces deterministic candidate observations, patches, trails, sessions, field-note scaffolds, and saved-artifact-backed leads with explicit evidence.
- `src/domain/agents/ui-agent.ts` assembles the typed home/workbench screen model that `src/views/home.ts` renders.
- `src/infra/storage/` persists clarification workflow snapshots, lightweight recent sessions, and saved foraging artifacts in process-local memory behind repository interfaces.
- `src/domain/agents/map-agent.ts`, `src/infra/geodata/`, and the home view provide a provider-backed geographic map with OSM as the default basemap, optional NLS topographic tiles, FinBIF overlays, and a thin Leaflet enhancement layer.
- `src/infra/llm/` provides deterministic fallback behavior plus an OpenAI-compatible local model path.
- `src/infra/observability/trace.ts` adds lightweight per-request tracing and model-call observation.

What is still intentionally unfinished:

- workflow state is still limited to the clarification flow rather than broader multi-step foraging work
- observability is still request-scoped and lightweight
- the local-model path still assumes an OpenAI-compatible endpoint instead of runtime-specific local adapters

---

## Design Principles

1. **Keep the runtime simple.** Use plain TypeScript modules and explicit message passing, not a heavyweight agent framework.
2. **Prefer many narrow services over one giant agent.** Each module should have a small, inspectable responsibility.
3. **Local model as participant, not controller.** The model interprets, explains, classifies, and drafts. It does not own truth, persistence, or routing.
4. **Server-first rendering.** Initial HTML should come from the Worker. JSON endpoints should support enhancement, not replace the app model.
5. **Offline-capable inference path.** Core local-model features should work without an external API key.
6. **Graceful capability tiers.** The application should support: no-model mode, local-model mode, and optional hosted-model mode later.
7. **Feature specs first.** Every lasting behavior belongs in `specs/`; every durable architecture decision belongs in an ADR.
8. **Local-first determinism.** Non-model paths should remain testable and deterministic.
9. **Progressive enhancement.** The app must remain useful with plain server-rendered views and minimal client JavaScript.
10. **Server-owned geodata configuration.** External basemap and overlay providers may enrich the map, but provider selection, credentials, and fallback rules belong to the server-side app model.

---

## High-Level Shape

The implementation should be organized into six layers:

1. **HTTP layer** – route requests and return HTML or JSON
2. **Application layer** – coordinate use cases through a small message bus
3. **Domain agents** – narrow modules with local state/logic
4. **Model adapter layer** – typed wrappers around local model inference
5. **Infrastructure layer** – storage, secrets, external APIs, observability
6. **View layer** – HTML rendering and optional client-side enhancement

The core idea is:

- routes translate HTTP into app messages
- the app layer dispatches those messages to modules
- modules return outcomes or follow-up messages
- views render the resulting state

---

## Foraging Product Spine

The semantic foraging app should revolve around one concrete loop:

1. a user frames a foraging task in natural language
2. the app classifies the task and asks for clarification when needed
3. the app gathers candidate observations, notes, or trails
4. the app explains why a candidate was surfaced
5. the user saves, refines, or continues the trail

That loop should shape the roadmap more than generic template concerns.

---

## Current Repo Shape

```txt
src/
  api/
    app-command.ts
    app-query.ts
    health.ts
    workbench.ts
  app/
    bus.ts
    context.ts
    message.ts
    use-cases/
      continue-intent-workflow.ts
      handle-user-intent.ts
      inspect-model-runtime.ts
      request-explanation.ts
      render-screen.ts
      run-health-check.ts
  domain/
    agents/
      map-agent.ts
      knowledge-agent.ts
      intent-agent.ts
      intent-workflow.ts
      session-agent.ts
      ui-agent.ts
    contracts/
      app-state.ts
      foraging-knowledge.ts
      map.ts
      model-runtime.ts
      result.ts
      screen.ts
      session.ts
      workflow.ts
  infra/
    geodata/
      provider.ts
    llm/
      provider.ts
      providers/
        openai-compatible.ts
        cloudflare-workers-ai.ts
        cloudflare-ai-gateway.ts
      runtime-capability.ts
    observability/
      logger.ts
      trace.ts
    storage/
      memory-store.ts
      repository.ts
  views/
    home.ts
    not-found.ts
    render-page.ts
  worker.ts
```

This is the architecture to orient on when reading the repo today. Future slices should extend this structure incrementally instead of chasing an idealized folder tree up front.

---

## Runtime Flow

### 1. Request arrives

`src/worker.ts` matches the route and delegates to a route handler.

### 2. Route handler builds an application message

Examples:

- `RenderHomeScreen`
- `SubmitUserIntent`
- `RequestExplanation`
- `RunHealthCheck`

Current implemented messages:

- `RenderHomeScreen`
- `RunHealthCheck`
- `InspectModelRuntime`
- `SubmitUserIntent`
- `ClarifyUserIntent`
- `RequestExplanation`

### 3. App bus dispatches the message

The bus invokes one or more narrow agents.

### 4. Agents return typed outputs

Outputs may include:

- updated app state
- a proposed screen model
- a follow-up question
- a request to call the model adapter
- an explanation or classification

Current implemented outputs:

- a typed `HomeScreenModel`
- a stable health payload
- a typed runtime-capability payload
- a typed intent-classification payload
- a serializable intent-workflow payload
- a typed explanation payload

### 5. View renderer turns screen model into HTML

HTML is returned for standard page requests. JSON is returned for enhancement endpoints.

---

## Core Modules

## 1. Message Bus

A tiny in-process dispatcher, not a distributed system.

Responsibilities:

- receive a typed app message
- resolve the responsible handler(s)
- collect outcomes
- preserve trace metadata for debugging

Guidelines:

- no hidden global mutable state
- no autonomous loops
- one request should produce a bounded chain of work
- message types should be explicit TypeScript unions

Current implementation note:

- the bus currently handles the full workbench request surface for screen rendering, health/runtime queries, intent submission, clarification continuation, and explanation requests
- workflow handling exists, but only for one bounded clarification path

Example message categories:

- `UIMessage`
- `IntentMessage`
- `KnowledgeMessage`
- `ModelMessage`
- `WorkflowMessage`

---

## 2. Intent Agent

Purpose:

- interpret user input into typed application intent
- map ambiguous free text into narrow action candidates
- decide when clarification is needed

Input examples:

- form submissions
- query parameters
- natural-language commands

Output examples:

- `CreateObservationIntent`
- `SearchIntent`
- `ExplainIntent`
- `ClarifyIntent`

Rules:

- use the local model only when deterministic parsing is insufficient
- always attach confidence and provenance
- never mutate durable state directly

---

## 3. Knowledge Agent

Purpose:

- own structured domain facts and lookups
- validate constraints
- enrich state with derived facts

Responsibilities:

- fetch entities from storage
- enforce domain constraints
- compute derived labels or relationships
- refuse unsupported transitions

This is where “truth” lives, not in the model.

---

## 4. Workflow Agent

Purpose:

- coordinate multi-step user tasks
- model bounded state transitions for each workflow

Examples:

- start task
- ask clarification
- confirm action
- finalize result

Rules:

- workflows are explicit finite-state transitions
- each transition is deterministic and testable
- the model may suggest the next step but cannot bypass workflow rules

---

## 5. UI Agent

Purpose:

- convert application state into a screen model
- propose components and interaction fragments
- decide when the user needs a question, a result, an alert, or a confirmation

Output should be a typed **screen model**, not raw HTML.

Example screen model:

```ts
interface ScreenModel {
  title: string;
  sections: SectionModel[];
  actions: ActionModel[];
  alerts?: AlertModel[];
  meta?: {
    traceId: string;
    confidence?: number;
  };
}
```

The view layer then renders that model into HTML.

---

## 6. Explanation Agent

Purpose:

- produce user-facing explanations
- summarize why the system suggested something
- expose provenance in plain language

This is a strong fit for a small local instruction model, as long as the task is bounded and the output is schema-checked.

Rules:

- explanation must be grounded in structured inputs
- responses should cite which module or rule produced the result
- never fabricate hidden certainty

---

## Inference Deployment Options

Target end-state options. The current repo implementation only ships the Cloudflare-native provider boundary in `src/infra/llm/`.

### Mode A – local inference server outside Cloudflare

Run a local inference server on the development machine, then have the app call it over HTTP during local development or self-hosted deployment.

Examples:

- LM Studio local server
- Ollama
- llama.cpp server

Best for:

- no API key
- easy experimentation
- swapping models without changing app logic

Trade-off:

- pure Cloudflare deployment cannot directly use a model running only on a developer laptop unless that endpoint is reachable

### Mode B – Cloudflare Workers AI

Recommended for managed cloud deployment on Cloudflare.

Workers AI provides serverless model inference on Cloudflare's network and can be invoked from Workers without the application managing third-party model API keys directly. ([developers.cloudflare.com](https://developers.cloudflare.com/workers-ai/?utm_source=chatgpt.com))

Best for:

- Cloudflare-native deployment
- simple operational model
- no user-managed external AI key in the app

Trade-off:

- model choices and behavior are constrained by the Cloudflare platform and available models

### Mode C – Cloudflare Agents runtime

Use Cloudflare Agents when you want durable, stateful, agent-like execution on Cloudflare.

Cloudflare's Agents platform provides persistent, stateful execution environments built on Durable Objects, with support for AI model calls and workflows. ([developers.cloudflare.com](https://developers.cloudflare.com/agents/?utm_source=chatgpt.com))

Best for:

- long-lived conversations or workflow state
- per-user or per-session agent instances
- durable message-oriented execution

Trade-off:

- more infrastructure complexity than a simple request/response Worker
- should be used selectively, not as an excuse to hide business logic inside opaque agents

### Mode D – AI Gateway with optional BYOK

Optional advanced mode.

Cloudflare AI Gateway supports bring-your-own-keys, where provider API keys can be stored securely in Cloudflare instead of being entered directly by end users in the app. ([developers.cloudflare.com](https://developers.cloudflare.com/ai-gateway/configuration/bring-your-own-keys/?utm_source=chatgpt.com))

Best for:

- optional access to external model providers
- centralized logging, caching, retries, and fallback policies
- keeping provider credentials out of the browser and application UI

Trade-off:

- still depends on external model providers
- should remain optional, not the default path

Recommended architecture choice:

- define a single model adapter boundary in the app
- support local inference, Workers AI, and optional AI Gateway BYOK through provider adapters
- use Cloudflare Agents only where durable execution genuinely improves the workflow

---

## Cloudflare Adapter Strategy

Add a Cloudflare-specific adapter layer under `src/infra/llm/providers/`.

```txt
src/infra/llm/
  provider.ts
  providers/
    local-ollama.ts
    local-lmstudio.ts
    cloudflare-workers-ai.ts
    cloudflare-ai-gateway.ts
    openai-compatible.ts
  prompts/
  schemas/
  runtime-capability.ts
```

Recommended provider split:

- `cloudflare-workers-ai.ts` for direct Workers AI inference
- `cloudflare-ai-gateway.ts` for optional routed access to external models and BYOK-backed gateway configs
- local providers for laptop and self-hosted development

The application layer should never know which provider is active. It should depend only on the typed provider contract.

### Cloudflare provider responsibilities

A Cloudflare provider adapter should:

- detect whether the required Cloudflare binding or gateway configuration is present
- normalize Cloudflare model responses into app-level typed outputs
- enforce schema validation before results enter domain logic
- record trace metadata for observability
- fail closed into deterministic fallback UI when inference is unavailable

## Local Model Integration Strategy

## Allowed local-model roles

Use the local model for:

- interpreting ambiguous user language
- drafting explanations
- summarizing state
- generating clarifying questions
- ranking UI wording variants

## Forbidden local-model roles

Do not let the local model:

- define routing rules implicitly
- own persistent state
- serve as the sole source of truth
- bypass domain validation
- emit untyped application state directly into rendering

## Model adapter contract

Create a narrow adapter such as:

```ts
interface ModelClient {
  classifyIntent(input: IntentClassificationInput): Promise<IntentClassificationResult>;
  explainDecision(input: ExplanationInput): Promise<ExplanationResult>;
  draftClarification(input: ClarificationInput): Promise<ClarificationResult>;
  getCapabilities(): Promise<ModelCapabilities>;
}
```

Requirements:

- typed input/output schemas
- strict JSON parsing
- support for local HTTP inference endpoints
- request logging without leaking sensitive data
- timeouts and graceful fallback paths
- explicit capability detection, because smaller local models may not reliably support every task

---

## Recommended Local Model Targets

Start with one of these classes of models:

- **3B–8B instruction model** for explanation, classification, and clarification
- **quantized GGUF model** for laptop-friendly local inference
- **JSON-capable instruct model** if you want stricter structured outputs

Practical recommendation:

- use a small instruct model via Ollama or LM Studio first
- prefer a model that is good enough at short classification and rewriting tasks
- avoid using the local model for deep planning or long autonomous loops

The application should treat the local model as best-effort assistance, not as a universal reasoning engine.

---

## Provider Adapter Design

Suggested contract:

```ts
interface ModelProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  completeJson<T>(input: JsonCompletionRequest<T>): Promise<T>;
  completeText(input: TextCompletionRequest): Promise<string>;
  getCapabilities(): Promise<ModelCapabilities>;
}
```

This lets the app switch providers without changing domain logic.

A simple resolver can choose the provider in this order:

1. explicit local provider in development
2. Cloudflare Workers AI in managed deployment
3. Cloudflare AI Gateway when configured
4. deterministic no-model fallback

That order keeps the default safe and predictable.

---

## Capability Tiering

The app should detect and expose runtime capability.

Example:

```ts
interface ModelCapabilities {
  available: boolean;
  supportsJsonMode: boolean;
  supportsStreaming: boolean;
  maxContextClass: "small" | "medium" | "unknown";
}
```

Use this to decide:

- whether to ask the model at all
- whether to use strict structured output
- whether to fall back to deterministic UX immediately

---

## Recommended Default Stack

For your use case, the simplest stack is:

- Cloudflare Worker for the web app
- **local Ollama or LM Studio** during development
- **Cloudflare Workers AI** as the managed default in cloud deployment
- **optional AI Gateway BYOK** for advanced provider routing later
- deterministic TypeScript fallbacks for every important flow

That gives you:

- no required end-user API key
- easy local development
- a Cloudflare-native production path
- optional provider flexibility later without rewriting the architecture

---

## HTTP Interface

## HTML routes

Examples:

- `GET /` → home screen
- `GET /app/:screen` → rendered screen
- `POST /actions/:actionId` → submit action, then redirect or rerender

## JSON routes

Examples:

- `GET /api/health` → existing health endpoint
- `POST /api/app/command` → submit typed app command
- `POST /api/app/query` → fetch screen model or explanation

Guidelines:

- HTML remains the primary interface
- JSON exists for enhancement, testing, and programmatic integration
- route handlers stay thin and delegate immediately into `src/app/`

---

## State Model

Use three distinct kinds of state.

### 1. Request state

Ephemeral per request.

Examples:

- trace id
- authenticated user context
- feature flags
- locale

### 2. Workflow state

Short-lived bounded task state.

Examples:

- current step
- pending clarification
- confidence

### 3. Durable domain state

Long-lived stored state.

Examples:

- user artifacts
- observations
- saved decisions
- domain entities

Rules:

- request state never leaks into durable storage unless explicitly persisted
- workflow state must be serializable
- durable state must be validated by domain modules before write

---

## Rendering Model

The rendering path should be:

1. build `ScreenModel`
2. pass to `views/render-page.ts`
3. render layout + page fragments
4. optionally enhance with small JavaScript

View conventions:

- page-level renderers in `views/pages/`
- reusable fragments in `views/fragments/`
- no business logic in HTML renderers
- HTML should degrade gracefully without client JS

---

## Observability

Add lightweight tracing from day one.

Per request capture:

- route
- message chain
- agent/module calls
- model usage
- timing
- confidence/provenance summaries

Create a trace object like:

```ts
interface TraceEvent {
  at: string;
  module: string;
  messageType: string;
  durationMs?: number;
  notes?: string[];
}
```

This is where message-oriented systems become opaque quickly without traces.

---

## Error Handling

Define explicit categories:

- validation error
- unsupported workflow transition
- storage failure
- model timeout
- model schema failure
- rendering failure

Rules:

- return deterministic fallback UI when the model fails
- keep user-facing errors polite and actionable
- log enough internal detail for debugging
- never expose secrets or raw provider responses

---

## Testing Strategy

Follow the template’s existing colocated tests and quality gates.

### Unit tests

Add tests next to each module:

- message bus behavior
- workflow transitions
- knowledge validation
- screen model generation
- model adapter parsing and fallback behavior

### End-to-end tests

Use Playwright for:

- page render smoke tests
- happy-path task execution
- graceful degradation when the model is unavailable

### Contract tests

Add focused tests for:

- message schemas
- screen model rendering contracts
- prompt output parsing

---

## First ADRs To Add

1. **ADR: Use a lightweight in-process message bus instead of a full agent framework**
2. **ADR: Keep server-rendered HTML as the primary UI delivery model**
3. **ADR: Treat the model as a typed inference adapter, not as an application controller**
4. **ADR: Support multiple inference providers through a shared model-provider contract**
5. **ADR: Use Workers AI as the default managed Cloudflare inference path**
6. **ADR: Keep AI Gateway BYOK optional and out of the default end-user flow**
7. **ADR: Represent rendered UI as typed screen models between app and view layers**

---

## Cloudflare Agents Positioning

Cloudflare Agents should not replace the app architecture. They should be used as an optional runtime for bounded durable workflows where state continuity matters.

Good fits:

- long-lived user sessions
- resumable multi-step workflows
- per-user conversational state
- scheduled follow-up processing

Poor fits:

- simple page requests
- deterministic rendering decisions
- core domain validation
- business rules that should remain transparent and testable

Use Cloudflare Agents as an infrastructure capability beneath the app's message-oriented architecture, not as the architecture itself. ([developers.cloudflare.com](https://developers.cloudflare.com/agents/?utm_source=chatgpt.com))

## Foraging Specs To Add

Suggested spec folders:

```txt
specs/foraging-workbench/spec.md
specs/intent-api/spec.md
specs/workflow-engine/spec.md
specs/model-integration/spec.md
specs/ui-rendering/spec.md
```

## Remaining Roadmap

The broad foundations are already in place. The next slices that still matter are:

### 1. Local model assistance

- use the local model for bounded interpretation, query rewriting, and explanation tasks
- keep deterministic fallback behavior for offline or degraded runs
- introduce model-assisted retrieval hints only where provenance remains explicit, for example synonym expansion, species-name normalization, or clarification wording

### 2. Durable foraging artifacts

- persist saved foraging trails, field notes, and patch inspections through the storage boundary
- deepen artifact workflows beyond save-and-reuse so the user can refine, compare, and continue a trail instead of only revisiting seeded workbench state

### 3. Hardening and richer workflows

- extend traces with retrieval, evidence, and explanation summaries so a surfaced trail can be audited end to end
- add e2e coverage for degraded paths and saved-session flows
- expand beyond the single clarification workflow into broader multi-step foraging tasks where the extra state is justified

---

## Non-Goals

Avoid these in the first implementation:

- background autonomous agents
- distributed queues
- long-running orchestration loops
- fully dynamic client-side SPA architecture
- untyped prompt-to-UI generation
- dependency-heavy agent frameworks

---

## Definition of Done

A feature is done when:

- the behavior is described in a spec
- any lasting architecture choice has an ADR
- routes stay thin
- domain rules remain deterministic and tested
- the local model is behind a typed adapter
- screen rendering flows through a typed screen model
- `npm run quality:gate` passes
- `npm run ci:local:quiet` passes

---

## One-Sentence Summary

Build a **server-first, Cloudflare-native, message-oriented semantic foraging app** where a local model helps interpret and explain, while deterministic TypeScript modules own workflow, retrieval truth, and rendering boundaries.
