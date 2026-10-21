/**
 * Parses a JSON request body, or returns null. Requiring application/json means a
 * cross-origin page needs a CORS preflight, which these routes never grant, so other
 * sites can't spend this app's API budget from their visitors' browsers.
 */
export async function readJsonBody(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return null;
  return request.json().catch(() => null);
}
