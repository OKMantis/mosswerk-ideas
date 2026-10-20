import { Agent, fetch } from "undici";
import { extractText } from "./extract-text";
import { checkUrl, GuardError, safeLookup } from "./url-guard";

const TIMEOUT_MS = 5_000;
const MAX_BYTES = 500_000;
const MAX_REDIRECTS = 3;
const MIN_TEXT_LENGTH = 50;

export class SiteError extends Error {
  constructor(readonly code: "invalid_url" | "unreachable") {
    super(code);
  }
}

type Request = (url: URL, signal: AbortSignal) => Promise<Response>;

// Every connection resolves DNS through safeLookup, so redirects and DNS rebinding
// can't reach a private address even though we only checkUrl() each hop.
const agent = new Agent({ connect: { lookup: safeLookup } });

const guardedFetch: Request = async (url, signal) =>
  (await fetch(url, {
    dispatcher: agent,
    redirect: "manual",
    signal,
    headers: { "user-agent": "MosswerkIdeasBot/1.0 (+https://mosswerk.com)", accept: "text/html,text/plain" },
  })) as unknown as Response;

async function readCapped(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel();
  return new TextDecoder().decode(Buffer.concat(chunks).subarray(0, MAX_BYTES));
}

async function fetchHtml(start: URL, request: Request): Promise<string> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await request(url, signal);
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      url = checkUrl(new URL(location, url).href);
      continue;
    }
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/^text\/(html|plain)\b/i.test(type)) throw new SiteError("unreachable");
    return readCapped(res);
  }
  throw new SiteError("unreachable");
}

/** Fetches a founder's page and returns its readable text, refusing anything that isn't a public website. */
export async function fetchSiteText(raw: string, request: Request = guardedFetch): Promise<string> {
  try {
    const text = extractText(await fetchHtml(checkUrl(raw), request));
    if (text.length < MIN_TEXT_LENGTH) throw new SiteError("unreachable");
    return text;
  } catch (err) {
    if (err instanceof SiteError) throw err;
    if (err instanceof GuardError || (err instanceof Error && err.cause instanceof GuardError)) {
      throw new SiteError("invalid_url");
    }
    throw new SiteError("unreachable");
  }
}
