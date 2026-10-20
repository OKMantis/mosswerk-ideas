/** How much of a site's text we send to the model. */
export const SITE_TEXT_LIMIT = 12_000;

const NAMED_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+|#39);/gi, (match, entity: string) => {
    const lower = entity.toLowerCase();
    if (lower in NAMED_ENTITIES) return NAMED_ENTITIES[lower];
    const code = lower.startsWith("#x") ? parseInt(lower.slice(2), 16) : lower.startsWith("#") ? Number(lower.slice(1)) : NaN;
    return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
  });
}

function metaDescription(html: string): string {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (/\bname\s*=\s*["']?description["']?/i.test(tag)) {
      return tag.match(/\bcontent\s*=\s*"([^"]*)"|\bcontent\s*=\s*'([^']*)'/i)?.slice(1).find(Boolean) ?? "";
    }
  }
  return "";
}

/**
 * Pulls the readable text out of a page: title, meta description, then body text.
 * Regex is enough here because the output is only ever read by the model, never rendered.
 */
export function extractText(html: string, limit = SITE_TEXT_LIMIT): string {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  const body = html
    .replace(/<head[\s\S]*?<\/head>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ");

  return decodeEntities([title, metaDescription(html), body].join(" "))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}
