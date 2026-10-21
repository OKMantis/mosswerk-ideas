import { afterEach, describe, expect, it, vi } from "vitest";
import { postSite, readChatStream } from "./api-client";
import sampleIdeas from "./ideas-fixture.json";

const streamOf = (...chunks: string[]) =>
  new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
        controller.close();
      },
    }),
  );

describe("readChatStream", () => {
  it("reassembles lines split across chunks and returns null for a question", async () => {
    const seen: string[] = [];
    const result = await readChatStream(
      streamOf('{"type":"text","te', 'xt":"Hi"}\n{"type":"text","text":" there"}\n'),
      (t) => seen.push(t),
    );
    expect(seen).toEqual(["Hi", " there"]);
    expect(result).toBeNull();
  });

  it("returns the result", async () => {
    const result = await readChatStream(streamOf(`${JSON.stringify({ type: "result", result: sampleIdeas })}\n`), () => {});
    expect(result).toEqual(sampleIdeas);
  });

  it("throws the code from an error event", async () => {
    await expect(readChatStream(streamOf('{"type":"error","code":"model_error"}\n'), () => {})).rejects.toMatchObject({
      code: "model_error",
    });
  });

  it("maps a firewall 429 with an HTML body to rate_limited", async () => {
    await expect(readChatStream(new Response("<html>", { status: 429 }), () => {})).rejects.toMatchObject({
      code: "rate_limited",
    });
  });

  it("uses the JSON error code from a failed response", async () => {
    await expect(readChatStream(Response.json({ error: "bad_request" }, { status: 400 }), () => {})).rejects.toMatchObject({
      code: "bad_request",
    });
  });

  it("treats an empty stream as a model error", async () => {
    await expect(readChatStream(streamOf(), () => {})).rejects.toMatchObject({ code: "model_error" });
  });
});

describe("postSite", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns the site text", async () => {
    vi.stubGlobal("fetch", async () => Response.json({ text: "Casa Sol" }));
    expect(await postSite("casasol.example")).toBe("Casa Sol");
  });

  it("passes through the server's error code", async () => {
    vi.stubGlobal("fetch", async () => Response.json({ error: "unreachable" }, { status: 502 }));
    await expect(postSite("x.example")).rejects.toMatchObject({ code: "unreachable" });
  });

  it("maps a network failure to model_error", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(postSite("x.example")).rejects.toMatchObject({ code: "model_error" });
  });
});
