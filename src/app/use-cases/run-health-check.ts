import { createHealthPayload } from "../../api/health";
import type { HealthCheckResult } from "../../domain/contracts/result";
import type { AppContext } from "../context";
import type { RunHealthCheckMessage } from "../message";

export async function runHealthCheck(context: AppContext, message: RunHealthCheckMessage): Promise<HealthCheckResult> {
  switch (message.type) {
    case "RunHealthCheck":
      return {
        kind: "health",
        payload: createHealthPayload(
          context.appName,
          context.routes.map((route) => route.path),
        ),
      };
  }
}
