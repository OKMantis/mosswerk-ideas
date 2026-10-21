// A stand-in for the Anthropic Messages API, so the e2e test runs the real /api/chat
// route without a key. It only ever asks questions on its own; ideas arrive only when
// the server forces them with output_config.format after the third answer.
import { readFileSync } from "node:fs";
import { createServer } from "node:http";

const PORT = Number(process.env.FAKE_ANTHROPIC_PORT ?? 4010);
const ideas = readFileSync(new URL("../src/lib/ideas-fixture.json", import.meta.url), "utf8");

function sse(res, events) {
  res.writeHead(200, { "content-type": "text/event-stream" });
  for (const data of events) res.write(`event: ${data.type}\ndata: ${JSON.stringify(data)}\n\n`);
  res.end();
}

function textReply(text) {
  const half = Math.ceil(text.length / 2);
  return [
    {
      type: "message_start",
      message: {
        id: "msg_fake",
        type: "message",
        role: "assistant",
        model: "claude-sonnet-5-5",
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 1, output_tokens: 1 },
      },
    },
    { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
    { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: text.slice(0, half) } },
    { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: text.slice(half) } },
    { type: "content_block_stop", index: 0 },
    { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 1 } },
    { type: "message_stop" },
  ];
}

createServer((req, res) => {
  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    if (req.method !== "POST" || !req.url.startsWith("/v1/messages")) return res.writeHead(404).end();
    const body = JSON.parse(raw);
    if (!String(body.messages[0]?.content).includes("<website_content>")) return res.writeHead(500).end();

    const questionsAsked = body.messages.filter((m) => m.role === "assistant").length;
    if (body.output_config?.format) return sse(res, textReply(ideas));
    if (questionsAsked === 0) {
      return sse(res, textReply("Villa rentals in Ibiza, ~12 properties. Where does most of your week go?"));
    }
    sse(res, textReply(`Question ${questionsAsked + 1}: what else eats your time?`));
  });
}).listen(PORT, () => console.log(`fake anthropic on ${PORT}`));
