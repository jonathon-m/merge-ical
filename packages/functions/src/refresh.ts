import type { Handler } from "aws-lambda";
import { scanAllGroups } from "./lib/dynamo.js";
import { putCachedCalendar } from "./lib/s3.js";
import { mergeCalendars } from "./lib/mergeIcal.js";

export const refreshHandler: Handler = async () => {
  const groups = await scanAllGroups();
  const active = groups.filter((g) => g.feeds.length > 0);

  console.log(`Refreshing ${active.length} calendar group(s)…`);

  const results = await Promise.allSettled(
    active.map(async (g) => {
      const merged = await mergeCalendars(
        g.feeds.map((f) => ({
          url: f.url,
          ownerName: f.name,
          filterPrefix: f.filterPrefix,
        }))
      );
      await putCachedCalendar(g.shareSecret, merged);
    })
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected");

  for (const f of failed) {
    console.error("Failed to refresh a group:", f.reason);
  }

  console.log(`Done — ${succeeded} succeeded, ${failed.length} failed`);
  return { succeeded, failed: failed.length };
};
