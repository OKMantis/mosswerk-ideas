# AI Ideas

A small tool at [ideas.mosswerk.com](https://ideas.mosswerk.com): a founder pastes their website, answers up to three questions, and gets one "best first bet" plus two smaller AI feature ideas that would make the business more profitable, with a link to book a call with [Mosswerk](https://mosswerk.com).

Next.js (App Router), TypeScript (strict), Tailwind v4 and Claude (`claude-sonnet-5-5`) through the Anthropic SDK. No database: the conversation lives in the browser and is re-sent each turn.

## How a turn works

```
browser ──POST /api/site {url}──────────────▶ fetch page through the URL guard → readable text
        ◀─────────────── {text} ─────────────
browser ──POST /api/chat {site, history}────▶ turnMode(history) → Claude, streamed
        ◀── NDJSON: {"type":"text"} … {"type":"result"} | {"type":"error"}
```

The server decides each turn's mode from the history it receives, so the three-question limit doesn't depend on the prompt or the client:

| Questions asked | Mode | What Claude gets |
|---|---|---|
| 0 | `open` | No tools. One-line summary of the business + first question. |
| 1–2 | `ask_or_recommend` | The strict `recommend_ideas` tool. Ask once more or recommend. |
| 3 | `recommend` | A JSON-schema response format: the ideas are the only possible output. |

History with more than three questions, or out of order, is rejected with 400 before any model call. Results are validated with zod (`src/lib/ideas-schema.ts`) before they reach the page, and rendered as cards.

## Safety and cost

- **SSRF guard** (`src/lib/url-guard.ts`, `src/lib/site.ts`): http/https only, ports 80/443, no credentials in URLs. Every DNS answer is checked against private, loopback, link-local, CGNAT, multicast and IPv6 equivalents *at connect time*, which also covers redirects (max 3) and DNS rebinding. 5 s timeout, 500 KB body cap, 12,000 characters sent to the model.
- **Prompt injection**: page text is wrapped in `<website_content>` tags that it can't close, and the system prompt treats it as untrusted data.
- **Cost caps**: `max_tokens` of 400 on the opening turn and 2,000 after; thinking set to its lowest level; answers capped at 1,000 characters.
- **Rate limit**: a Vercel Firewall rule limits `/api/*` per IP. The client turns a 429 into a friendly message.

## Run it

```bash
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm install
npm run dev
```

## Tests

```bash
npm test        # Vitest: URL guard, site fetch, turn rules, result schema, prompt, client stream parsing
npm run e2e     # Playwright: the full flow against a fake Anthropic API (e2e/fake-anthropic.mjs)
```

The e2e test runs the real `/api/chat` route with `ANTHROPIC_BASE_URL` pointed at a local fake that never volunteers ideas, so the cards only appear because the server enforces the limit. It uses your installed Google Chrome.
