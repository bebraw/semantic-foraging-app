# vibe-template

`vibe-template` currently ships as a Cloudflare Worker application served with Wrangler, implemented in JavaScript/TypeScript, and centered on server-rendered HTML with a small JSON API stub.

This is a template for my vibecoding projects and it captures what I consider my best practices so I don't have to repeat them for each experiment.

The repo vendors ASDLC reference material in `.asdlc/` as local guidance instead of recreating it per project. Repo-specific truth lives in `ARCHITECTURE.md`, `specs/`, and `docs/adrs/`: generated code still needs to match those documents, and passing CI alone is not enough.

Local development in this repo targets macOS. Other platforms may need script and tooling adjustments before the baseline workflow works as documented.

## Documentation

- Development setup and local CI: `docs/development.md`
- Architecture decisions: `docs/adrs/README.md`
- Feature and architecture specs: `specs/README.md`
- Agent behavior and project rules: `AGENTS.md`

## Runtime

- Run `nvm use` before `npm install` or any other development command so your shell picks up the repo-pinned Node.js and npm versions.
- Install dependencies with `npm install`.
- The exact project Node.js version is pinned in `package.json`, and CI reads that value directly.
- npm now comes from that pinned Node release instead of a separate repo version file.
- Copy `.dev.vars.example` to `.dev.vars` before running projects that need local secrets.
- Use repo-pinned CLI tools through `npx`, including `npx wrangler` for Cloudflare-based experiments.
- Start the stub Worker with `npm run dev`, then open `http://127.0.0.1:8787`.
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

- `GET /` serves a minimal HTML Worker stub.
- `GET /styles.css` serves the generated Tailwind stylesheet.
- `GET /api/health` serves a JSON health response for smoke tests and tooling.
- `POST /api/app/query` returns a typed screen model for bounded app-query requests.
- `POST /api/intent` classifies a request into a bounded set of supported intents and can request clarification.
- `POST /api/intent/clarify` continues the bounded clarification workflow using a stored `workflowId`.
- `POST /api/explanation` returns grounded explanation text from a bounded query payload.
- App responses include lightweight `x-trace-id` and `x-trace-events` headers for debugging request flow.
- Intent and explanation responses also report whether the final output came from deterministic fallback logic or model-backed inference.

## Source Layout

- `src/worker.ts` is the Worker entry point and top-level router.
- `src/app/` holds typed application messages, the app bus, and route-level use cases.
- `src/api/` holds HTTP adapters for app queries and commands.
- `src/domain/contracts/` holds typed app output models such as screens and result payloads.
- `src/views/` holds HTML rendering modules for the starter UI.
- Tests live next to the code they exercise under `src/`.

## Application Screenshot

![Starter app screenshot](docs/screenshots/home.png)

## Model setup

This app supports Cloudflare-native model execution.

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
