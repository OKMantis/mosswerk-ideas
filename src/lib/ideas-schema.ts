import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export const Idea = z.object({
  title: z.string().min(1).describe("Short name for the feature"),
  whyItFits: z
    .string()
    .min(1)
    .describe("One or two short sentences, under 40 words: why it fits THIS business, citing one specific thing from their site or answers"),
  moneyAngle: z.object({
    kind: z.enum(["fewer_lost_sales", "hours_saved", "more_revenue"]),
    detail: z.string().min(1).describe('One sentence, e.g. "About 10 hours a week of enquiry replies"'),
  }),
  size: z.enum(["small", "medium", "large"]),
  timeline: z.string().min(1).describe('Rough build time for one senior engineer, e.g. "2–3 weeks"'),
});
export type Idea = z.infer<typeof Idea>;

export const IdeasResult = z.object({
  bestBet: Idea.describe("The one feature to build first"),
  smallerIdeas: z.array(Idea).length(2).describe("Exactly two smaller ideas"),
});
export type IdeasResult = z.infer<typeof IdeasResult>;

export const IDEAS_TOOL_NAME = "recommend_ideas";

// Strict schemas can't express these; parseIdeas still enforces them after the call.
const UNSUPPORTED = new Set(["$schema", "minLength", "maxLength", "minItems", "maxItems"]);

function forStrictMode(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(forStrictMode);
  if (node === null || typeof node !== "object") return node;
  return Object.fromEntries(
    Object.entries(node).filter(([key]) => !UNSUPPORTED.has(key)).map(([key, value]) => [key, forStrictMode(value)]),
  );
}

const schema = forStrictMode(z.toJSONSchema(IdeasResult)) as Anthropic.Tool.InputSchema;

/** Structured-output format for the turn where the server requires the recommendation. */
export const ideasFormat = { type: "json_schema" as const, schema };

/** Tool the model may call once it has heard enough. */
export const ideasTool: Anthropic.Tool = {
  name: IDEAS_TOOL_NAME,
  description: "Give the founder one best first bet and two smaller AI feature ideas.",
  strict: true,
  input_schema: schema,
};

// The model occasionally double-escapes non-ASCII ("\\u20ac" instead of "€"), which would show up on the cards.
function decodeEscapes(node: unknown): unknown {
  if (typeof node === "string") return node.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  if (Array.isArray(node)) return node.map(decodeEscapes);
  if (node === null || typeof node !== "object") return node;
  return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, decodeEscapes(value)]));
}

export function parseIdeas(input: unknown): IdeasResult | null {
  const parsed = IdeasResult.safeParse(decodeEscapes(input));
  return parsed.success ? parsed.data : null;
}
