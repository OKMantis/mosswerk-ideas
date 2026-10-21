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

const SKIPPED = new Set(["script", "style", "noscript", "svg", "template", "title"]);

function metaDescription(tag: string): string {
  if (!/\bname\s*=\s*["']?description["']?/i.test(tag)) return "";
  return tag.match(/\bcontent\s*=\s*"([^"]*)"|\bcontent\s*=\s*'([^']*)'/i)?.slice(1).find(Boolean) ?? "";
}

/**
 * Pulls the readable text out of a page: title, meta description, then body text.
 * A single indexOf scan rather than regexes over the whole page: lazy regexes go
 * quadratic on hostile HTML (500 KB of "<" took minutes). The output is only ever
 * read by the model, never rendered.
 */
export function extractText(html: string, limit = SITE_TEXT_LIMIT): string {
  const lower = html.toLowerCase();
  const body: string[] = [];
  let title = "";
  let description = "";
  let i = 0;

  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt === -1) {
      body.push(html.slice(i));
      break;
    }
    body.push(html.slice(i, lt));

    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt + 4);
      if (end === -1) break;
      i = end + 3;
      continue;
    }
    // A "<" that doesn't start a tag (as in "price < 100") is just text.
    if (!/[a-z/!]/i.test(html[lt + 1] ?? "")) {
      body.push("<");
      i = lt + 1;
      continue;
    }
    const gt = html.indexOf(">", lt);
    if (gt === -1) break;

    const tag = html.slice(lt, gt + 1);
    const name = tag.match(/^<([a-z][a-z0-9-]*)/i)?.[1].toLowerCase() ?? "";
    i = gt + 1;
    body.push(" ");

    if (name === "meta") description ||= metaDescription(tag);
    if (SKIPPED.has(name)) {
      const close = lower.indexOf(`</${name}`, i);
      if (name === "title") title ||= html.slice(i, close === -1 ? undefined : close);
      if (close === -1) break;
      const end = html.indexOf(">", close);
      if (end === -1) break;
      i = end + 1;
    }
  }

  return decodeEntities([title, description, body.join("")].join(" "))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}
