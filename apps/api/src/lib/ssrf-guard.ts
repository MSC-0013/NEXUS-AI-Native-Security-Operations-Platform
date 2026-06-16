import { ForbiddenError } from "./errors.js";

// RFC 1918 private ranges + loopback + link-local + metadata endpoints
const BLOCKED_PATTERNS: RegExp[] = [
  /^127\./,           // 127.0.0.0/8 loopback
  /^10\./,            // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\./,  // 172.16.0.0/12
  /^192\.168\./,      // 192.168.0.0/16
  /^169\.254\./,      // 169.254.0.0/16 link-local + cloud metadata
  /^0\./,             // 0.0.0.0/8
  /^::1$/,            // IPv6 loopback
  /^fc00:/i,          // IPv6 unique local
  /^fe80:/i,          // IPv6 link-local
];

const BLOCKED_HOSTS: Set<string> = new Set([
  "localhost",
  "metadata.google.internal",
  "169.254.169.254",  // AWS/GCP/Azure IMDS
  "100.100.100.200",  // Alibaba Cloud metadata
]);

/**
 * Validates a URL against SSRF risks. Throws ForbiddenError for blocked targets.
 * Call before any outbound HTTP request from user-supplied URLs.
 */
export function assertSafeUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new ForbiddenError("Invalid URL");
  }

  const protocol = parsed.protocol.toLowerCase();
  if (!["http:", "https:"].includes(protocol)) {
    throw new ForbiddenError("Only HTTP/HTTPS URLs are allowed");
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTS.has(hostname)) {
    throw new ForbiddenError("URL target is not allowed");
  }

  // Strip IPv6 brackets
  const ip = hostname.startsWith("[") ? hostname.slice(1, -1) : hostname;

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(ip)) {
      throw new ForbiddenError("URL resolves to a private or reserved address");
    }
  }

  return parsed;
}

/**
 * Safe fetch wrapper — validates URL before dispatching.
 */
export async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  assertSafeUrl(url);
  return fetch(url, init);
}
