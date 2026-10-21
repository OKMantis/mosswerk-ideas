import { z } from "zod";
import { readJsonBody } from "@/lib/read-json";
import { fetchSiteText, SiteError } from "@/lib/site";

const Body = z.object({ url: z.string().max(2048) });

export async function POST(request: Request) {
  const body = Body.safeParse(await readJsonBody(request));
  if (!body.success) return Response.json({ error: "invalid_url" }, { status: 400 });

  try {
    return Response.json({ text: await fetchSiteText(body.data.url) });
  } catch (err) {
    const code = err instanceof SiteError ? err.code : "unreachable";
    return Response.json({ error: code }, { status: code === "invalid_url" ? 400 : 502 });
  }
}
