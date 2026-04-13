## Model runtime policy

The application supports these runtime modes:

1. No-model mode
   - All features remain functional using deterministic logic only.

2. Workers AI mode
   - Default managed production mode on Cloudflare.

3. AI Gateway mode
   - Optional production mode when centralized AI controls are desired.

The app must not require an end-user API key for normal operation.
