/**
 * Merges multiple iCal feeds into a single VCALENDAR string.
 *
 * Per feed:
 *  - Events are prefixed with the owner's name: "Name: Original summary"
 *  - If filterPrefix is set, only events whose SUMMARY starts with it are
 *    included, and the prefix is stripped before adding the owner prefix.
 *
 * Deduplicates events by UID (first occurrence wins).
 * Deduplicates VTIMEZONE blocks by TZID.
 */

export interface FeedConfig {
  url: string;
  ownerName: string;
  filterPrefix?: string;
}

export async function mergeCalendars(feeds: FeedConfig[]): Promise<string> {
  if (feeds.length === 0) {
    return formatCalendar([], []);
  }

  const results = await Promise.allSettled(
    feeds.map((feed) =>
      fetch(feed.url, { signal: AbortSignal.timeout(10_000) }).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} from ${feed.url}`);
        return r.text();
      })
    )
  );

  const timezones = new Map<string, string>();
  const events = new Map<string, string>();

  for (let i = 0; i < feeds.length; i++) {
    const result = results[i];
    if (result.status === "rejected") continue;

    const { ownerName, filterPrefix } = feeds[i];
    // Unfold lines (RFC 5545: CRLF + whitespace = continuation)
    const unfolded = result.value.replace(/\r?\n[ \t]/g, "");

    for (const block of extractBlocks(unfolded, "VTIMEZONE")) {
      const tzid = extractProperty(block, "TZID");
      if (tzid && !timezones.has(tzid)) {
        timezones.set(tzid, block);
      }
    }

    for (const block of extractBlocks(unfolded, "VEVENT")) {
      const uid = extractProperty(block, "UID");
      if (!uid || events.has(uid)) continue;

      const processed = processEvent(block, ownerName, filterPrefix);
      if (processed !== null) {
        events.set(uid, processed);
      }
    }
  }

  if (results.every((r) => r.status === "rejected")) {
    throw new Error("Failed to fetch any calendar feeds");
  }

  return formatCalendar(
    Array.from(timezones.values()),
    Array.from(events.values())
  );
}

/**
 * Applies filter and name-prefix to a VEVENT block.
 * Returns null if the event should be excluded by the filter.
 */
function processEvent(
  block: string,
  ownerName: string,
  filterPrefix?: string
): string | null {
  const summaryMatch = block.match(/(SUMMARY(?:;[^:]*)?):(.*)/);

  if (!summaryMatch) {
    // No SUMMARY — include with just the owner's name
    return block.replace(
      "END:VEVENT",
      `SUMMARY:${ownerName}:\r\nEND:VEVENT`
    );
  }

  const [fullMatch, summaryKey, summaryValue] = summaryMatch;

  if (filterPrefix) {
    if (!summaryValue.startsWith(filterPrefix)) return null;
    const stripped = summaryValue.slice(filterPrefix.length).trimStart();
    return block.replace(fullMatch, `${summaryKey}:${ownerName}: ${stripped}`);
  }

  return block.replace(fullMatch, `${summaryKey}:${ownerName}: ${summaryValue}`);
}

function extractBlocks(text: string, componentName: string): string[] {
  const blocks: string[] = [];
  const begin = `BEGIN:${componentName}`;
  const end = `END:${componentName}`;
  let pos = 0;

  while (true) {
    const start = text.indexOf(begin, pos);
    if (start === -1) break;
    const finish = text.indexOf(end, start);
    if (finish === -1) break;
    blocks.push(text.slice(start, finish + end.length));
    pos = finish + end.length;
  }

  return blocks;
}

function extractProperty(block: string, name: string): string | null {
  const match = block.match(
    new RegExp(`(?:^|\\r?\\n)${name}(?:;[^:]*)?:(.+)`, "m")
  );
  return match ? match[1].trim() : null;
}

function formatCalendar(timezones: string[], events: string[]): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//merge-ical//merge-ical//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...timezones,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}
