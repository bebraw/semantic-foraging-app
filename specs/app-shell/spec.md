## Model runtime policy

The application supports these runtime modes:

1. No-model mode
   - All features remain functional using deterministic logic only.

2. Workers AI mode
   - Default managed production mode on Cloudflare.

3. AI Gateway mode
   - Optional production mode when centralized AI controls are desired.

The app must not require an end-user API key for normal operation.

## App-shell query flow

1. `GET /` must resolve through a typed application query that returns a screen model before HTML is rendered.
   - The current app shell renders a semantic foraging workbench rather than a static starter stub.
2. `GET /api/health` must resolve through a typed application query that returns the stable health payload before JSON is returned.
3. The app shell must preserve deterministic output in no-model mode.
4. The app shell may expose command-style or query-style JSON endpoints, including a generic app-command surface, but route handlers must still translate them into typed app messages before app logic runs.
5. App-shell responses must include stable request-trace headers for debugging.
6. The home screen model and shared page renderer may expose the active request trace ID in developer-facing HTML.
7. The home screen model may expose the active model runtime tier and capability summary so contributors can see whether the app is running in no-model, local-model, or hosted-model mode.
