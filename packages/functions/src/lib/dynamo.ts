import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export interface Feed {
  name: string;
  url: string;
  addedAt: string;
  /** If set, only events whose SUMMARY starts with this string are included; the prefix is stripped before merging. */
  filterPrefix?: string;
}

export interface CalendarGroup {
  shareSecret: string;
  dateCreated: string;
  dateLastAccessed?: string;
  feeds: Feed[];
}

function tableName(): string {
  return Resource.CalendarGroups.name;
}

export async function getGroup(
  shareSecret: string
): Promise<CalendarGroup | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: tableName(),
      Key: { shareSecret },
    })
  );
  return (result.Item as CalendarGroup) ?? null;
}

export async function putGroup(group: CalendarGroup): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: tableName(),
      Item: group,
    })
  );
}

export async function updateFeeds(
  shareSecret: string,
  feeds: Feed[]
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: { shareSecret },
      UpdateExpression: "SET feeds = :feeds",
      ExpressionAttributeValues: { ":feeds": feeds },
    })
  );
}

export async function updateLastAccessed(shareSecret: string): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: { shareSecret },
      UpdateExpression: "SET dateLastAccessed = :now",
      ExpressionAttributeValues: { ":now": new Date().toISOString() },
    })
  );
}

export async function scanAllGroups(): Promise<CalendarGroup[]> {
  const groups: CalendarGroup[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: tableName(),
        ExclusiveStartKey: lastKey,
      })
    );
    if (result.Items) {
      groups.push(...(result.Items as CalendarGroup[]));
    }
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return groups;
}
