# vibe-template

`vibe-template` currently ships as a Cloudflare Worker application served with Wrangler, implemented in JavaScript/TypeScript, and centered on a server-rendered semantic foraging workbench plus a small JSON API surface.

This is a template for my vibecoding projects and it captures what I consider my best practices so I don't have to repeat them for each experiment.

The repo vendors ASDLC reference material in `.asdlc/` as local guidance instead of recreating it per project. Repo-specific truth lives in `ARCHITECTURE.md`, `specs/`, and `docs/adrs/`: generated code still needs to match those documents, and passing CI alone is not enough.

Local development in this repo targets macOS. Other platforms may need script and tooling adjustments before the baseline workflow works as documented.

## Documentation

- Development setup and local CI: `docs/development.md`
- Architecture decisions: `docs/adrs/README.md`
- Feature and architecture specs: `specs/README.md`
- Agent behavior and project rules: `AGENTS.md`

## Runtime

- Run `nvm use` before `npm install` or any other development command so your shell picks up the repo-pinned Node.js version and a supported npm 11 release.
- Install dependencies with `npm install`.
- The exact project Node.js version is pinned in `package.json`, and CI reads that value directly.
- npm now comes from that pinned Node release, with the accepted npm 11 range declared in `package.json`.
- Copy `.dev.vars.example` to `.dev.vars` before running projects that need local secrets.
- Use repo-pinned CLI tools through `npx`, including `npx wrangler` for Cloudflare-based experiments.
- Start the local Worker with `npm run dev`, then open `http://127.0.0.1:8787`.
- Rebuild the generated Tailwind stylesheet manually with `npm run build:css` when needed.

## Verification

- Run the fast local gate with `npm run quality:gate:fast` during normal iteration.
- Run the baseline repo gate with `npm run quality:gate`.
- Run the containerized local workflow with `npm run ci:local:quiet`.
- If local Agent CI warns about `No such remote 'origin'`, set `GITHUB_REPO=owner/repo` in `.env.agent-ci`.
- Retry a paused local CI run with `npm run ci:local:retry -- --name <runner-name>`.
- Install the pinned Playwright browser with `npm run playwright:install`.
- Run unit tests from colocated `src/**/*.test.ts` files with `npm test`.
- Run browser tests from colocated `src/**/*.e2e.ts` files with `npm run e2e`.

## Starter App

- `GET /` serves a server-rendered semantic foraging workbench for manual flow testing plus deterministic candidate retrieval cards.
- Completed intents are persisted as lightweight in-memory recent sessions and rendered back into the workbench.
- `resume-session` flows now reuse those persisted recent sessions instead of relying only on static demo session cards.
- `GET /styles.css` serves the generated Tailwind stylesheet.
- `GET /api/health` serves a JSON health response for smoke tests and tooling.
- `POST /api/app/command` dispatches typed app commands through a generic JSON endpoint.
- `POST /api/app/query` returns a typed screen model for bounded app-query requests.
- `POST /api/intent` classifies a request into bounded semantic-foraging intents, extracts grounded cues, and can request clarification.
- `POST /api/intent/clarify` continues the bounded clarification workflow using a stored `workflowId`.
- `POST /api/explanation` returns grounded explanation text from a bounded query payload.
- `POST /actions/intent` renders intent classification results back into the workbench.
- `POST /actions/intent/clarify` continues the clarification workflow through the same server-rendered workbench.
- `POST /actions/explanation` renders grounded explanation results back into the workbench.
- App responses include lightweight `x-trace-id` and `x-trace-events` headers for debugging request flow.
- Intent and explanation responses also report whether the final output came from deterministic fallback logic or model-backed inference.

## Source Layout

- `src/worker.ts` is the Worker entry point and top-level router.
- `src/app/` holds typed application messages, the app bus, and route-level use cases.
- `src/api/` holds HTTP adapters for app queries and commands.
- `src/domain/contracts/` holds typed app output models such as screens and result payloads.
- `src/views/` holds HTML rendering modules for the foraging workbench UI.
- Tests live next to the code they exercise under `src/`.

## Application Screenshot

![Starter app screenshot](docs/screenshots/home.png)

## Model setup

This app supports both local OpenAI-compatible model execution and Cloudflare-native model execution.

### Local path: Ollama or LM Studio

Set:

- `LOCAL_MODEL_BASE_URL`
- `LOCAL_MODEL_NAME`
- optional `LOCAL_MODEL_API_KEY`

Examples:

- Ollama: `LOCAL_MODEL_BASE_URL=http://127.0.0.1:11434/v1`
- LM Studio: `LOCAL_MODEL_BASE_URL=http://127.0.0.1:1234/v1`

When local model vars are present, the provider resolver prefers that local OpenAI-compatible path over Workers AI or AI Gateway so local development can opt in explicitly.

### Default path: Workers AI

1. Add a Workers AI binding in Wrangler
2. Set `WORKERS_AI_MODEL`
3. Use the built-in provider resolver

### Optional path: AI Gateway

Use AI Gateway in front of Workers AI when you want:

- analytics
- centralized logging
- retries
- caching
- routing or future fallback controls

Set:

- `AI_GATEWAY_ACCOUNT_ID`
- `AI_GATEWAY_ID`
- `AI_GATEWAY_TOKEN`
- `AI_GATEWAY_PROVIDER_PATH`
- `AI_GATEWAY_MODEL`

### Failure behavior

If no model provider is configured or inference fails, the application falls back to deterministic logic.
