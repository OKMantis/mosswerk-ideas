import type { IdeasResult } from "./ideas-schema";
import type { ErrorCode, StreamEvent } from "./protocol";
import type { ChatMessage } from "./turns";

export class ApiError extends Error {
  constructor(readonly code: ErrorCode) {
    super(code);
  }
}

async function post(path: string, body: unknown): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new ApiError("model_error");
  }
  return assertOk(res);
}

async function assertOk(res: Response): Promise<Response> {
  // Checked before parsing: the Vercel Firewall answers 429 with an HTML page.
  if (res.status === 429) throw new ApiError("rate_limited");
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: ErrorCode } | null;
    throw new ApiError(body?.error ?? "model_error");
  }
  return res;
}

export async function postSite(url: string): Promise<string> {
  const { text } = (await (await post("/api/site", { url })).json()) as { text: string };
  return text;
}

/** Streams one chat turn. Returns the ideas if this turn produced them, or null if it was a question. */
export async function postChat(site: string, history: ChatMessage[], onText: (chunk: string) => void): Promise<IdeasResult | null> {
  return readChatStream(await post("/api/chat", { site, history }), onText);
}

export async function readChatStream(res: Response, onText: (chunk: string) => void): Promise<IdeasResult | null> {
  await assertOk(res);
  if (!res.body) throw new ApiError("model_error");

  let buffer = "";
  let sawText = false;
  let result: IdeasResult | null = null;
  const handle = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as StreamEvent;
    if (event.type === "error") throw new ApiError(event.code);
    if (event.type === "result") result = event.result;
    else {
      sawText = true;
      onText(event.text);
    }
  };

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    buffer += decoder.decode(chunk.value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop()!;
    lines.forEach(handle);
  }
  handle(buffer);

  if (!result && !sawText) throw new ApiError("model_error");
  return result;
}
