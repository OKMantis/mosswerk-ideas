import { z } from "zod";
import { SITE_TEXT_LIMIT } from "./extract-text";

export const MAX_QUESTIONS = 3;

const ChatMessage = z.discriminatedUnion("role", [
  z.object({ role: z.literal("assistant"), content: z.string().min(1).max(2_000) }),
  z.object({ role: z.literal("user"), content: z.string().min(1).max(1_000) }),
]);
export type ChatMessage = z.infer<typeof ChatMessage>;

/** open: summary + first question. ask_or_recommend: model decides. recommend: tool call is forced. */
export type TurnMode = "open" | "ask_or_recommend" | "recommend";

const ChatRequest = z.object({
  site: z.string().min(1).transform((site) => site.slice(0, SITE_TEXT_LIMIT)),
  history: z
    .array(ChatMessage)
    .max(2 * MAX_QUESTIONS)
    // The client re-sends the whole conversation, so the server checks its shape:
    // assistant, user, assistant, user, ... always ending on the founder's answer.
    .refine((history) => history.length % 2 === 0)
    .refine((history) => history.every((m, i) => m.role === (i % 2 === 0 ? "assistant" : "user"))),
});

export function parseChatRequest(body: unknown): { site: string; history: ChatMessage[] } | null {
  const parsed = ChatRequest.safeParse(body);
  return parsed.success ? parsed.data : null;
}

export function turnMode(history: ChatMessage[]): TurnMode {
  const questionsAsked = history.filter((m) => m.role === "assistant").length;
  if (questionsAsked === 0) return "open";
  return questionsAsked < MAX_QUESTIONS ? "ask_or_recommend" : "recommend";
}
