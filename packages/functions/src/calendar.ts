import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getGroup, updateLastAccessed } from "./lib/dynamo.js";
import { getCachedCalendar, putCachedCalendar } from "./lib/s3.js";
import { mergeCalendars } from "./lib/mergeIcal.js";
import { isValidShareSecret } from "./lib/validate.js";

export const getMergedCalendarHandler: APIGatewayProxyHandlerV2 = async (
  event
) => {
  const { shareSecret } = event.pathParameters ?? {};
  if (!shareSecret || !isValidShareSecret(shareSecret)) {
    return { statusCode: 400, body: "Invalid shareSecret" };
  }

  const group = await getGroup(shareSecret);
  if (!group) {
    return { statusCode: 404, body: "Calendar group not found" };
  }

  const calHeaders: Record<string, string> = {
    "Content-Type": "text/calendar; charset=utf-8",
    "Cache-Control": "public, max-age=1800",
  };

  // Record access time without blocking the response
  updateLastAccessed(shareSecret).catch(() => {});

  if (group.feeds.length === 0) {
    return {
      statusCode: 200,
      headers: calHeaders,
      body: [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//merge-ical//merge-ical//EN",
        "END:VCALENDAR",
      ].join("\r\n"),
    };
  }

  const cached = await getCachedCalendar(shareSecret);
  if (cached) {
    return { statusCode: 200, headers: calHeaders, body: cached };
  }

  const merged = await mergeCalendars(
    group.feeds.map((f) => ({
      url: f.url,
      ownerName: f.name,
      filterPrefix: f.filterPrefix,
    }))
  );
  await putCachedCalendar(shareSecret, merged);

  return { statusCode: 200, headers: calHeaders, body: merged };
};
