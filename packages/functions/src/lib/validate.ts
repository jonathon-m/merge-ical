// ---------- constants ----------

export const MAX_NAME_LENGTH = 100;
export const MAX_URL_LENGTH = 2048;
export const MAX_FILTER_PREFIX_LENGTH = 100;
export const MAX_FEEDS_PER_GROUP = 20;

// ---------- share secret ----------

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidShareSecret(s: string): boolean {
  return UUID_RE.test(s);
}

// ---------- feed URL (SSRF protection) ----------

/**
 * Hostnames that must never be fetched regardless of what the URL looks like.
 * Covers AWS/GCP IMDS endpoints and loopback aliases.
 */
const BLOCKED_HOSTS = new Set([
  "localhost",
  "0.0.0.0",
  "169.254.169.254",        // AWS & Azure IMDS
  "metadata.google.internal", // GCP IMDS
]);

/**
 * Private / reserved IPv4 and IPv6 ranges.
 * If the hostname parses as one of these the URL is rejected.
 */
const PRIVATE_IP_PATTERNS: RegExp[] = [
  /^127\./,                       // IPv4 loopback
  /^10\./,                        // RFC 1918
  /^172\.(1[6-9]|2\d|3[01])\./,  // RFC 1918
  /^192\.168\./,                  // RFC 1918
  /^169\.254\./,                  // Link-local (IMDS lives here)
  /^0\./,                         // "This" network
  /^::1$/,                        // IPv6 loopback
  /^fc[0-9a-f]{2}:/i,             // IPv6 ULA
  /^fd[0-9a-f]{2}:/i,             // IPv6 ULA
  /^fe80:/i,                      // IPv6 link-local
];

/**
 * Validates a calendar feed URL.
 * Returns an error message string, or null if the URL is acceptable.
 */
export function validateFeedUrl(rawUrl: string): string | null {
  if (rawUrl.length > MAX_URL_LENGTH) {
    return `URL must be at most ${MAX_URL_LENGTH} characters`;
  }

  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return "Must be a valid URL";
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return "URL must use HTTP or HTTPS";
  }

  // Strip IPv6 brackets so patterns match consistently
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (BLOCKED_HOSTS.has(host)) {
    return "URL host is not allowed";
  }

  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(host)) {
      return "URL must point to a public host";
    }
  }

  return null;
}

// ---------- text fields ----------

/** Returns an error string or null. */
export function validateName(name: string | undefined): string | null {
  if (!name?.trim()) return "name is required";
  if (name.trim().length > MAX_NAME_LENGTH)
    return `name must be at most ${MAX_NAME_LENGTH} characters`;
  return null;
}

export function validateFilterPrefix(
  value: string | undefined
): string | null {
  if (!value) return null; // optional
  if (value.trim().length > MAX_FILTER_PREFIX_LENGTH)
    return `filterPrefix must be at most ${MAX_FILTER_PREFIX_LENGTH} characters`;
  return null;
}
