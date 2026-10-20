import { expect, it } from "vitest";
import { extractText, SITE_TEXT_LIMIT } from "./extract-text";

it("drops scripts and styles and keeps title and meta description", () => {
  const text = extractText(
    `<html><head><title>Casa Sol</title><meta name="description" content="Villa rentals in Ibiza"><style>x{}</style></head><body><script>evil()</script><!-- hidden --><h1>12 villas</h1>&amp; more</body></html>`,
  );
  expect(text).toContain("Casa Sol");
  expect(text).toContain("Villa rentals in Ibiza");
  expect(text).toContain("12 villas & more");
  expect(text).not.toContain("evil");
  expect(text).not.toContain("x{}");
  expect(text).not.toContain("hidden");
});

it("decodes numeric entities and collapses whitespace", () => {
  expect(extractText("<p>Caf&#233;\n\n   &#x2014;  open</p>")).toBe("Café — open");
});

it("caps output at the limit", () => {
  expect(extractText("<p>" + "a ".repeat(20_000) + "</p>")).toHaveLength(SITE_TEXT_LIMIT);
});
