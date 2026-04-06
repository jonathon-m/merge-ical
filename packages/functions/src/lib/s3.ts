import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Resource } from "sst";

const s3 = new S3Client({});
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function bucketName(): string {
  return Resource.MergedCalendars.name;
}

function calendarKey(shareSecret: string): string {
  return `${shareSecret}/merged.ics`;
}

export async function getCachedCalendar(
  shareSecret: string
): Promise<string | null> {
  try {
    const result = await s3.send(
      new GetObjectCommand({
        Bucket: bucketName(),
        Key: calendarKey(shareSecret),
      })
    );

    const lastModified = result.LastModified;
    if (lastModified && Date.now() - lastModified.getTime() > CACHE_TTL_MS) {
      return null;
    }

    const body = await result.Body?.transformToString();
    return body ?? null;
  } catch {
    return null;
  }
}

export async function putCachedCalendar(
  shareSecret: string,
  content: string
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName(),
      Key: calendarKey(shareSecret),
      Body: content,
      ContentType: "text/calendar",
    })
  );
}
