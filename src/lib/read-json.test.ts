import { expect, it } from "vitest";
import { readJsonBody } from "./read-json";

const post = (body: string, contentType?: string) =>
  new Request("http://localhost/api/chat", {
    method: "POST",
    body,
    headers: contentType ? { "content-type": contentType } : {},
  });

it("parses a JSON body", async () => {
  expect(await readJsonBody(post('{"a":1}', "application/json; charset=utf-8"))).toEqual({ a: 1 });
});

it("ignores a text/plain body, which a cross-origin page can send without a preflight", async () => {
  expect(await readJsonBody(post('{"a":1}', "text/plain"))).toBeNull();
});

it("returns null for malformed JSON", async () => {
  expect(await readJsonBody(post("{", "application/json"))).toBeNull();
});
