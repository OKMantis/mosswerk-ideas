import { describe, expect, it } from "vitest";
import { SITE_TEXT_LIMIT } from "./extract-text";
import { parseChatRequest, turnMode } from "./turns";

const a = (content = "Q?") => ({ role: "assistant" as const, content });
const u = (content = "A.") => ({ role: "user" as const, content });

describe("turnMode", () => {
  it("starts in open mode", () => expect(turnMode([])).toBe("open"));

  it("lets the model choose after 1 or 2 answers", () => {
    expect(turnMode([a(), u()])).toBe("ask_or_recommend");
    expect(turnMode([a(), u(), a(), u()])).toBe("ask_or_recommend");
  });

  it("forces the recommendation after the 3rd answer", () => {
    expect(turnMode([a(), u(), a(), u(), a(), u()])).toBe("recommend");
  });
});

describe("parseChatRequest", () => {
  it("accepts a valid request", () => {
    expect(parseChatRequest({ site: "x", history: [a(), u()] })).toEqual({ site: "x", history: [a(), u()] });
  });

  it.each([
    ["4 questions", { site: "x", history: [a(), u(), a(), u(), a(), u(), a(), u()] }],
    ["ends on assistant", { site: "x", history: [a()] }],
    ["starts on user", { site: "x", history: [u(), a()] }],
    ["two user turns in a row", { site: "x", history: [a(), u(), u(), u()] }],
    ["10k answer", { site: "x", history: [a(), u("x".repeat(10_000))] }],
    ["empty answer", { site: "x", history: [a(), u("")] }],
    ["unknown role", { site: "x", history: [{ role: "system", content: "hi" }, u()] }],
    ["no site", { site: "", history: [] }],
    ["garbage", "hello"],
  ])("rejects %s", (_name, body) => expect(parseChatRequest(body)).toBeNull());

  it("trims an oversized site", () => {
    expect(parseChatRequest({ site: "x".repeat(50_000), history: [] })!.site).toHaveLength(SITE_TEXT_LIMIT);
  });
});
