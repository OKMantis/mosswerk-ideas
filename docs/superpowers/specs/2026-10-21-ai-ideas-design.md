# AI Ideas — Design

Agreed with Owen Moss in a brainstorm before this repo existed. Copied verbatim below.

## What it is
A small public tool at ideas.mosswerk.com where a founder pastes their website, has a
short chat, and gets AI feature recommendations that would make their business more
profitable.

## Why it exists
- Founders don't know which AI features could make their business more profitable.
  This answers that for them, then hands off to a booking call with Owen Moss
  (Mosswerk, a one-person Rails + AI agency).
- It's also proof that Owen ships in TypeScript/React/Next.js, not only Rails.
  Hiring managers will read the code, so it must be clean, small and well tested.

## Flow
1. Founder pastes a URL. The server fetches the page and extracts readable text.
2. The assistant opens with a one-line summary of the business ("Villa rentals in
   Ibiza, ~12 properties") and asks the first question about where their time or
   money goes.
3. At most 3 questions total, enforced server-side, not just in the prompt.
4. The result: ONE "best first bet" plus TWO smaller ideas. Each has a title, why it
   fits *this* business (cite something from their site or answers), the money angle
   (fewer lost sales / hours saved per week / more revenue), size (small/medium/large)
   and a rough timeline. Return the result as structured output (tool use / JSON
   schema) and render it as cards, not chat prose.
5. A "Book a call about this" button links to https://calendar.app.google/A3UYyubyPp7ND7qKA
   plus a link back to https://mosswerk.com. No email capture, no database, no saved
   results.

Keep ideas realistic: things a solo senior engineer ships in weeks (enquiry/support
assistants, multilingual content generation, document/invoice extraction, lead
qualification, search over their own content, internal admin copilots). No sci-fi.

## Stack
- Next.js (App Router) + TypeScript (strict), Tailwind v4, deployed on Vercel at
  ideas.mosswerk.com. Public GitHub repo under OKMantis.
- Claude via the Anthropic API, model claude-sonnet-5-5, key in env var
  ANTHROPIC_API_KEY (never committed). Stream the assistant's replies.
- No database. Conversation state lives in the client and is re-sent each turn; the
  server re-validates the turn count.

## Look
Match mosswerk.com: dark theme, Inter font, these tokens:
ink #070d1b, surface #0b1428, glow #1a2e5c, fg #e8ecf5, muted #aab5cc,
accent #5b8cff, line #27375a. One page, mobile-first, no logo wall.

## Safety and cost (non-negotiable)
- URL fetch: http/https only; block localhost, private and link-local IPs (check after
  DNS resolution and on redirects); 5s timeout; cap response size (~500 KB) and the
  text sent to the model.
- Treat website text as untrusted data, not instructions (prompt-injection guard in
  the system prompt, delimited input).
- Rate limit the API route per IP (a Vercel Firewall rule is fine if it covers it;
  otherwise the smallest working option). Cap max_tokens per call.
- Friendly error states: site unreachable, rate limited, model error.

## Testing
- Vitest for the URL guard, the turn-limit logic and result-schema parsing.
- One Playwright end-to-end test of the full flow with the Claude call mocked.

## Out of scope
Accounts, lead capture, analytics, admin, multiple pages, i18n.
