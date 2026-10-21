import type { IdeasResult } from "./ideas-schema";

export type ErrorCode = "invalid_url" | "unreachable" | "rate_limited" | "model_error" | "bad_request";

/** One line of the NDJSON stream /api/chat sends back. */
export type StreamEvent =
  | { type: "text"; text: string }
  | { type: "result"; result: IdeasResult }
  | { type: "error"; code: ErrorCode };

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  invalid_url: "That doesn't look like a public website address. Try something like yourbusiness.com.",
  unreachable: "We couldn't read that site. Check the address, or try your homepage.",
  rate_limited: "Lots of people are trying this right now. Give it a minute and try again.",
  model_error: "Something went wrong on our side. Try again in a moment.",
  bad_request: "That conversation got out of step. Start again from your website.",
};
