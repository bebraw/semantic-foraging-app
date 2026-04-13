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
2. `GET /api/health` must resolve through a typed application query that returns the stable health payload before JSON is returned.
3. The app shell must preserve deterministic output in no-model mode.
4. The app shell may expose command-style JSON endpoints, but route handlers must still translate them into typed app messages before app logic runs.
5. App-shell responses must include stable request-trace headers for debugging.
