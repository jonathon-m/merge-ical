import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import {
  type CalendarGroup,
  type Feed,
  getGroup,
  putGroup,
  updateFeeds,
} from "./lib/dynamo.js";
import { putCachedCalendar } from "./lib/s3.js";
import { mergeCalendars, type FeedConfig } from "./lib/mergeIcal.js";
import {
  isValidShareSecret,
  validateFeedUrl,
  validateFilterPrefix,
  validateName,
  MAX_FEEDS_PER_GROUP,
} from "./lib/validate.js";

function toFeedConfigs(feeds: Feed[]): FeedConfig[] {
  return feeds.map((f) => ({
    url: f.url,
    ownerName: f.name,
    filterPrefix: f.filterPrefix,
  }));
}

function toFeedSummaries(feeds: Feed[]) {
  return feeds.map((f) => ({
    name: f.name,
    addedAt: f.addedAt,
    filterPrefix: f.filterPrefix,
  }));
}

const json = (statusCode: number, body: unknown) => ({
  headers: { "Content-Type": "application/json" },
  statusCode,
  body: JSON.stringify(body),
});

function badSecret() {
  return json(400, { error: "Invalid shareSecret" });
}

export const createGroupHandler: APIGatewayProxyHandlerV2 = async () => {
  const shareSecret = uuidv4();
  const group: CalendarGroup = {
    shareSecret,
    dateCreated: new Date().toISOString(),
    feeds: [],
  };
  await putGroup(group);
  return json(201, { shareSecret });
};

export const getGroupHandler: APIGatewayProxyHandlerV2 = async (event) => {
  const { shareSecret } = event.pathParameters ?? {};
  if (!shareSecret || !isValidShareSecret(shareSecret)) return badSecret();

  const group = await getGroup(shareSecret);
  if (!group) return json(404, { error: "Group not found" });

  return json(200, {
    shareSecret: group.shareSecret,
    dateCreated: group.dateCreated,
    dateLastAccessed: group.dateLastAccessed,
    feeds: toFeedSummaries(group.feeds),
  });
};

export const addFeedHandler: APIGatewayProxyHandlerV2 = async (event) => {
  const { shareSecret } = event.pathParameters ?? {};
  if (!shareSecret || !isValidShareSecret(shareSecret)) return badSecret();

  let body: { name?: string; url?: string; filterPrefix?: string };
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }
  const { name, url, filterPrefix } = body;

  const nameErr = validateName(name);
  if (nameErr) return json(400, { error: nameErr });

  if (!url?.trim()) return json(400, { error: "url is required" });
  const urlErr = validateFeedUrl(url);
  if (urlErr) return json(400, { error: urlErr });

  const prefixErr = validateFilterPrefix(filterPrefix);
  if (prefixErr) return json(400, { error: prefixErr });

  const group = await getGroup(shareSecret);
  if (!group) return json(404, { error: "Group not found" });

  if (group.feeds.length >= MAX_FEEDS_PER_GROUP) {
    return json(400, {
      error: `A group can have at most ${MAX_FEEDS_PER_GROUP} feeds`,
    });
  }

  const feed: Feed = {
    name: name!.trim(),
    url: url.trim(),
    addedAt: new Date().toISOString(),
    ...(filterPrefix?.trim() ? { filterPrefix: filterPrefix.trim() } : {}),
  };
  const feeds = [...group.feeds, feed];
  await updateFeeds(shareSecret, feeds);

  try {
    const merged = await mergeCalendars(toFeedConfigs(feeds));
    await putCachedCalendar(shareSecret, merged);
  } catch {
    // Non-fatal: cache will be regenerated on next request
  }

  return json(200, { feeds: toFeedSummaries(feeds) });
};

export const removeFeedHandler: APIGatewayProxyHandlerV2 = async (event) => {
  const { shareSecret, feedIndex } = event.pathParameters ?? {};
  if (!shareSecret || !isValidShareSecret(shareSecret)) return badSecret();

  const index = parseInt(feedIndex ?? "", 10);
  if (!Number.isInteger(index) || index < 0) {
    return json(400, { error: "Invalid feedIndex" });
  }

  const group = await getGroup(shareSecret);
  if (!group) return json(404, { error: "Group not found" });
  if (index >= group.feeds.length) {
    return json(400, { error: "feedIndex out of range" });
  }

  const feeds = group.feeds.filter((_, i) => i !== index);
  await updateFeeds(shareSecret, feeds);

  try {
    const merged = await mergeCalendars(toFeedConfigs(feeds));
    await putCachedCalendar(shareSecret, merged);
  } catch {
    // Non-fatal
  }

  return json(200, { feeds: toFeedSummaries(feeds) });
};
