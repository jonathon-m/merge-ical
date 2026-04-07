/**
 * Merges multiple iCal feeds into a single VCALENDAR string.
 *
 * Per feed:
 *  - If filterPrefix is set, only events whose SUMMARY starts with it are
 *    included; the prefix is stripped from the summary.
 *  - Events are prefixed with the owner's name.
 *
 * When multiple feeds share an event (same UID):
 *  - The event appears once, prefixed with all attending owners joined by " & "
 *    e.g. "Alice & Bob: Team standup"
 *
 * Deduplicates VTIMEZONE blocks by TZID.
 */

export interface FeedConfig {
  url: string;
  ownerName: string;
  filterPrefix?: string;
}

interface EventEntry {
  /** All owners whose feed included this event (after filter). */
  owners: string[];
  /** Raw VEVENT block from the first feed that claimed it. */
  canonicalBlock: string;
  /** SUMMARY value after the first owner's filterPrefix was stripped. */
  strippedSummary: string;
}

export async function mergeCalendars(feeds: FeedConfig[]): Promise<string> {
  if (feeds.length === 0) return formatCalendar([], []);

  const results = await Promise.allSettled(
    feeds.map((feed) =>
      fetch(feed.url, { signal: AbortSignal.timeout(10_000) }).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} from ${feed.url}`);
        return r.text();
      })
    )
  );

  if (results.every((r) => r.status === "rejected")) {
    throw new Error("Failed to fetch any calendar feeds");
  }

  const timezones = new Map<string, string>();
  const eventMap = new Map<string, EventEntry>();

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
      if (!uid) continue;

      const rawSummary = extractProperty(block, "SUMMARY") ?? "";

      // Apply this feed's filter — skip event for this owner if it doesn't match
      if (filterPrefix && !rawSummary.startsWith(filterPrefix)) continue;

      // Strip filter prefix to get the clean summary
      const strippedSummary = filterPrefix
        ? rawSummary.slice(filterPrefix.length).trimStart()
        : rawSummary;

      // Use UID + RECURRENCE-ID as the map key so that modified instances of a
      // recurring series each get their own entry rather than colliding on UID.
      const recurrenceId = extractProperty(block, "RECURRENCE-ID") ?? "";
      const key = `${uid}\0${recurrenceId}`;

      const existing = eventMap.get(key);
      if (existing) {
        // Already claimed — add owner only if not already present.
        // The same owner can appear multiple times for the same key when their
        // feed contains duplicate blocks (e.g. some calendar servers repeat the
        // base VEVENT alongside every exception).
        if (!existing.owners.includes(ownerName)) {
          existing.owners.push(ownerName);
        }
      } else {
        eventMap.set(key, { owners: [ownerName], canonicalBlock: block, strippedSummary });
      }
    }
  }

  const events = Array.from(eventMap.values()).map(
    ({ owners, canonicalBlock, strippedSummary }) => {
      const prefix = owners.join(" & ");
      return setSummary(canonicalBlock, `${prefix}: ${strippedSummary}`);
    }
  );

  return formatCalendar(Array.from(timezones.values()), events);
}

// ---------- helpers ----------

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

/** Replace the SUMMARY value in a VEVENT block, or insert one if absent. */
function setSummary(block: string, newSummary: string): string {
  const match = block.match(/(SUMMARY(?:;[^:]*)?):.*/);
  if (match) {
    return block.replace(match[0], `${match[1]}:${newSummary}`);
  }
  return block.replace("END:VEVENT", `SUMMARY:${newSummary}\r\nEND:VEVENT`);
}

function formatCalendar(timezones: string[], events: string[]): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//mergical//mergical//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...timezones,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}
