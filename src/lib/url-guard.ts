import dns, { type LookupAddress, type LookupOptions } from "node:dns";
import net from "node:net";

/** Thrown when a URL or the address it resolves to isn't a public website. */
export class GuardError extends Error {}

const blocked = new net.BlockList();
for (const [prefix, bits] of [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, cloud metadata
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved, broadcast
] as const) {
  blocked.addSubnet(prefix, bits, "ipv4");
}
for (const [prefix, bits] of [
  ["::", 128], // unspecified
  ["::1", 128], // loopback (IPv4-mapped ::ffff:a.b.c.d is matched against the IPv4 rules by BlockList)
  ["64:ff9b::", 96], // NAT64: could wrap a private IPv4
  ["2001::", 32], // Teredo: same risk
  ["2002::", 16], // 6to4: same risk
  ["fc00::", 7], // unique local
  ["fe80::", 10], // link-local
  ["ff00::", 8], // multicast
] as const) {
  blocked.addSubnet(prefix, bits, "ipv6");
}

/** True for anything that isn't a public unicast IP, including strings that aren't IPs at all. */
export function isBlockedIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 0) return true;
  return blocked.check(ip, family === 4 ? "ipv4" : "ipv6");
}

/**
 * Parses what a founder typed into a URL we're willing to fetch. Hostnames are
 * checked again at connect time by `safeLookup`; IP literals skip DNS, so they're
 * checked here.
 */
export function checkUrl(raw: string): URL {
  const input = raw.trim();
  let url: URL;
  try {
    url = new URL(input.includes("://") ? input : `https://${input}`);
  } catch {
    throw new GuardError("Not a valid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new GuardError("Only http and https are allowed");
  if (url.username || url.password) throw new GuardError("Credentials aren't allowed");
  if (url.port && url.port !== "80" && url.port !== "443") throw new GuardError("Non-standard ports aren't allowed");

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host) && isBlockedIp(host)) throw new GuardError("Private addresses aren't allowed");
  return url;
}

/** A `dns.lookup` replacement that refuses hostnames resolving to any non-public address. */
export function makeSafeLookup(resolve: typeof dns.lookup = dns.lookup): net.LookupFunction {
  return function safeLookup(hostname, options: LookupOptions, callback) {
    resolve(hostname, { ...options, all: true }, (err, addresses: LookupAddress[]) => {
      if (err) return callback(err, "");
      if (addresses.length === 0 || addresses.some((a) => isBlockedIp(a.address))) {
        return callback(new GuardError(`${hostname} resolves to a private address`), "");
      }
      if (options.all) return callback(null, addresses);
      callback(null, addresses[0].address, addresses[0].family);
    });
  };
}

export const safeLookup = makeSafeLookup();
