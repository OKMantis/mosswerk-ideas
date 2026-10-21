import { expect, test } from "@playwright/test";
import sampleIdeas from "../src/lib/ideas-fixture.json" with { type: "json" };

test("founder gets three ideas after at most three questions", async ({ page }) => {
  // The real site fetch is unit-tested, and the URL guard rightly refuses local test servers.
  await page.route("**/api/site", (route) =>
    route.fulfill({ json: { text: "Casa Sol. Villa rentals in Ibiza. 12 villas with pools." } }),
  );

  await page.goto("/");
  await page.getByLabel("Your website").fill("casasol.example");
  await page.getByRole("button", { name: "Get ideas" }).click();

  await expect(page.getByText("Villa rentals in Ibiza, ~12 properties")).toBeVisible();
  await expect(page.getByText("Question 1 of 3")).toBeVisible();

  for (const [i, answer] of ["Answering enquiries", "WhatsApp mostly", "About 15 hours a week"].entries()) {
    if (i > 0) await expect(page.getByText(`Question ${i + 1} of 3`)).toBeVisible();
    await page.getByLabel("Your answer").fill(answer);
    await page.getByRole("button", { name: "Send" }).click();
  }

  await expect(page.getByRole("heading", { name: "Your best first bet" })).toBeVisible();
  await expect(page.getByRole("heading", { name: sampleIdeas.bestBet.title })).toBeVisible();
  for (const idea of sampleIdeas.smallerIdeas) {
    await expect(page.getByRole("heading", { name: idea.title })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Book a call about this" })).toHaveAttribute(
    "href",
    "https://calendar.app.google/A3UYyubyPp7ND7qKA",
  );
  await expect(page.getByRole("link", { name: "mosswerk.com" })).toHaveAttribute("href", "https://mosswerk.com");
  await expect(page.getByLabel("Your answer")).toHaveCount(0);
});

test("a rate-limited founder sees a friendly message and can start over", async ({ page }) => {
  await page.route("**/api/site", (route) => route.fulfill({ json: { text: "Casa Sol. Villa rentals in Ibiza." } }));
  await page.route("**/api/chat", (route) => route.fulfill({ status: 429, body: "<html>Too Many Requests</html>" }));

  await page.goto("/");
  await page.getByLabel("Your website").fill("casasol.example");
  await page.getByRole("button", { name: "Get ideas" }).click();

  // Filtered by text: Next.js renders its own role="alert" route announcer.
  const rateLimited = page.getByRole("alert").filter({ hasText: /give it a minute/i });
  await expect(rateLimited).toBeVisible();
  await page.getByRole("button", { name: "Start over" }).click();
  await expect(page.getByLabel("Your website")).toBeVisible();
  await expect(rateLimited).toHaveCount(0);
});
