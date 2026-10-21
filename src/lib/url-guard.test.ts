import type { LookupAddress } from "node:dns";
import { describe, expect, it } from "vitest";
import { checkUrl, GuardError, isBlockedIp, makeSafeLookup } from "./url-guard";

describe("isBlockedIp", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "::1",
    "fe80::1",
    "fd00::1",
    "::ffff:127.0.0.1",
    "64:ff9b::a9fe:a9fe",
    "not-an-ip",
  ])("blocks %s", (ip) => expect(isBlockedIp(ip)).toBe(true));

  it.each(["93.184.216.34", "2606:4700::1111"])("allows %s", (ip) =>
    expect(isBlockedIp(ip)).toBe(false),
  );
});

describe("checkUrl", () => {
  it("adds https to a bare domain", () => expect(checkUrl("acme.com").href).toBe("https://acme.com/"));

  it("keeps an explicit http URL", () => expect(checkUrl("http://acme.com/about").href).toBe("http://acme.com/about"));

  it.each([
    "ftp://acme.com",
    "javascript:alert(1)",
    "file:///etc/passwd",
    "http://user:pw@acme.com",
    "http://acme.com:8080",
    "http://127.0.0.1",
    "http://[::1]/",
    "http://169.254.169.254/latest",
    "",
    "not a url",
  ])("rejects %s", (u) => expect(() => checkUrl(u)).toThrow(GuardError));
});

describe("safeLookup", () => {
  const fake = (addresses: string[]) =>
    makeSafeLookup(((_host: string, _opts: unknown, cb: (err: null, all: LookupAddress[]) => void) =>
      cb(null, addresses.map((address) => ({ address, family: address.includes(":") ? 6 : 4 })))) as never);

  const run = (lookup: ReturnType<typeof makeSafeLookup>, opts: { all?: boolean }) =>
    new Promise<unknown[]>((resolve, reject) =>
      lookup("x.com", opts, (err: Error | null, ...rest: unknown[]) => (err ? reject(err) : resolve(rest))),
    );

  it("fails when any resolved address is private", async () => {
    await expect(run(fake(["93.184.216.34", "10.0.0.1"]), { all: true })).rejects.toBeInstanceOf(GuardError);
  });

  it("passes public addresses through in single-address form", async () => {
    expect(await run(fake(["93.184.216.34"]), {})).toEqual(["93.184.216.34", 4]);
  });

  it("passes all addresses when asked", async () => {
    expect(await run(fake(["93.184.216.34"]), { all: true })).toEqual([[{ address: "93.184.216.34", family: 4 }]]);
  });
});
