import { describe, expect, it } from "vitest";
import { SITE_TEXT_LIMIT } from "./extract-text";
import { fetchSiteText } from "./site";

const html = (body: string, init: ResponseInit = {}) =>
  new Response(body, { headers: { "content-type": "text/html; charset=utf-8" }, ...init });
const redirect = (location: string) => new Response(null, { status: 302, headers: { location } });

describe("fetchSiteText", () => {
  it("returns extracted text", async () => {
    const text = await fetchSiteText("acme.com", async () =>
      html("<title>Acme</title><p>We sell handmade furniture in Bristol, delivered across the UK.</p>"),
    );
    expect(text).toContain("handmade furniture");
  });

  it("rejects a private address before requesting anything", async () => {
    const seen: string[] = [];
    await expect(
      fetchSiteText("http://127.0.0.1/", async (u) => (seen.push(u.href), html(""))),
    ).rejects.toMatchObject({ code: "invalid_url" });
    expect(seen).toEqual([]);
  });

  it("refuses a redirect to a private IP without requesting it", async () => {
    const seen: string[] = [];
    const request = async (u: URL) => (seen.push(u.href), redirect("http://169.254.169.254/"));
    await expect(fetchSiteText("acme.com", request)).rejects.toMatchObject({ code: "invalid_url" });
    expect(seen).toEqual(["https://acme.com/"]);
  });

  it("follows a relative redirect", async () => {
    const request = async (u: URL) =>
      u.pathname === "/" ? redirect("/home") : html("<title>Acme home</title><p>Handmade furniture from Bristol, since 1998.</p>");
    expect(await fetchSiteText("acme.com", request)).toContain("since 1998");
  });

  it("gives up after 3 redirects", async () => {
    await expect(fetchSiteText("acme.com", async () => redirect("https://acme.com/next"))).rejects.toMatchObject({
      code: "unreachable",
    });
  });

  it("rejects an error status", async () => {
    await expect(fetchSiteText("acme.com", async () => html("nope", { status: 404 }))).rejects.toMatchObject({
      code: "unreachable",
    });
  });

  it("rejects non-HTML", async () => {
    const pdf = async () => new Response("%PDF-1.7", { headers: { "content-type": "application/pdf" } });
    await expect(fetchSiteText("acme.com", pdf)).rejects.toMatchObject({ code: "unreachable" });
  });

  it("truncates a 2 MB body instead of failing", async () => {
    const text = await fetchSiteText("acme.com", async () => html("<title>Big</title><p>" + "word ".repeat(400_000)));
    expect(text.startsWith("Big")).toBe(true);
    expect(text.length).toBeLessThanOrEqual(SITE_TEXT_LIMIT);
  });

  it("treats a near-empty JS app as unreachable", async () => {
    const spa = async () => html('<div id="root"></div><script src="a.js"></script>');
    await expect(fetchSiteText("acme.com", spa)).rejects.toMatchObject({ code: "unreachable" });
  });

  it("maps a network error to unreachable", async () => {
    const broken = async (): Promise<Response> => {
      throw new TypeError("fetch failed");
    };
    await expect(fetchSiteText("acme.com", broken)).rejects.toMatchObject({ code: "unreachable" });
  });
});
