import type { AppErrorResult } from "../domain/contracts/result";

export function createErrorResponse(result: AppErrorResult): Response {
  return Response.json(
    {
      ok: false,
      category: result.error.category,
      error: result.error.message,
    },
    { status: result.error.status },
  );
}
