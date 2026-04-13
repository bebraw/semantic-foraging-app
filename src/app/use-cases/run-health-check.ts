import { createHealthPayload } from "../../api/health";
import type { HealthCheckResult } from "../../domain/contracts/result";
import type { AppContext } from "../context";
import type { RunHealthCheckMessage } from "../message";

export async function runHealthCheck(context: AppContext, message: RunHealthCheckMessage): Promise<HealthCheckResult> {
  switch (message.type) {
    case "RunHealthCheck":
      context.trace.addEvent({
        module: "app.use-cases.run-health-check",
        messageType: message.type,
        notes: [`routes:${context.routes.length}`],
      });

      return {
        kind: "health",
        payload: createHealthPayload(
          context.appName,
          context.routes.map((route) => route.path),
        ),
      };
  }
}
