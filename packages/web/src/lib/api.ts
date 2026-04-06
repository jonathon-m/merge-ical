const API_URL = import.meta.env.VITE_API_URL ?? "";

export interface FeedSummary {
  name: string;
  addedAt: string;
  filterPrefix?: string;
}

export interface GroupSummary {
  shareSecret: string;
  createdAt: string;
  feeds: FeedSummary[];
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function createGroup(): Promise<{ shareSecret: string }> {
  return request("/groups", { method: "POST" });
}

export async function getGroup(shareSecret: string): Promise<GroupSummary> {
  return request(`/groups/${shareSecret}`);
}

export async function addFeed(
  shareSecret: string,
  name: string,
  url: string,
  filterPrefix?: string
): Promise<{ feeds: FeedSummary[] }> {
  return request(`/groups/${shareSecret}/feeds`, {
    method: "POST",
    body: JSON.stringify({ name, url, ...(filterPrefix ? { filterPrefix } : {}) }),
  });
}

export async function removeFeed(
  shareSecret: string,
  feedIndex: number
): Promise<{ feeds: FeedSummary[] }> {
  return request(`/groups/${shareSecret}/feeds/${feedIndex}`, {
    method: "DELETE",
  });
}

export function calendarUrl(shareSecret: string): string {
  return `${API_URL}/cal/${shareSecret}/merged.ics`;
}
