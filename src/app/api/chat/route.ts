import Anthropic from "@anthropic-ai/sdk";
import { ideasFormat, ideasTool, parseIdeas, type IdeasResult } from "@/lib/ideas-schema";
import { buildMessages, systemPrompt } from "@/lib/prompt";
import type { StreamEvent } from "@/lib/protocol";
import { parseChatRequest, turnMode, type ChatMessage, type TurnMode } from "@/lib/turns";

const MODEL = "claude-sonnet-5-5";

function requestFor(mode: TurnMode, site: string, history: ChatMessage[]): Anthropic.MessageStreamParams {
  const base = {
    model: MODEL,
    system: systemPrompt(mode, history.length / 2),
    messages: buildMessages(site, history),
    // Lowest thinking setting: replies start fast and max_tokens is spent on the answer.
    thinking: { type: "between_tools" as const },
  };
  switch (mode) {
    case "open":
      return { ...base, max_tokens: 400 };
    case "ask_or_recommend":
      return { ...base, max_tokens: 2_000, tools: [ideasTool], tool_choice: { type: "auto" } };
    case "recommend":
      // This model rejects a forced tool call, so the last turn uses a JSON-schema response instead.
      return { ...base, max_tokens: 2_000, output_config: { format: ideasFormat } };
  }
}

function resultFrom(message: Anthropic.Message, mode: TurnMode): IdeasResult | null {
  if (mode === "recommend") {
    const json = message.content.map((block) => (block.type === "text" ? block.text : "")).join("");
    try {
      return parseIdeas(JSON.parse(json));
    } catch {
      return null;
    }
  }
  const toolUse = message.content.find((block) => block.type === "tool_use");
  return toolUse ? parseIdeas(toolUse.input) : null;
}

/** A question turn is fine without a result, as long as the model actually said something. */
function isQuestion(message: Anthropic.Message, mode: TurnMode): boolean {
  return (
    mode !== "recommend" &&
    message.stop_reason === "end_turn" &&
    message.content.some((block) => block.type === "text" && block.text.trim() !== "")
  );
}

export async function POST(request: Request) {
  const chat = parseChatRequest(await request.json().catch(() => null));
  if (!chat) return Response.json({ error: "bad_request" }, { status: 400 });

  const mode = turnMode(chat.history);
  // Built per request so ANTHROPIC_BASE_URL is read at runtime (the e2e test points it at a fake).
  const stream = new Anthropic().messages.stream(requestFor(mode, chat.site, chat.history));
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      // The recommend turn's text is raw JSON, so it isn't streamed to the founder.
      if (mode !== "recommend") stream.on("text", (text) => send({ type: "text", text }));
      try {
        const message = await stream.finalMessage();
        const result = resultFrom(message, mode);
        if (result) send({ type: "result", result });
        else if (!isQuestion(message, mode)) send({ type: "error", code: "model_error" });
      } catch (err) {
        console.error("chat: model call failed", err instanceof Error ? err.message : err);
        send({ type: "error", code: "model_error" });
      }
      controller.close();
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, { headers: { "content-type": "application/x-ndjson", "cache-control": "no-store" } });
}
