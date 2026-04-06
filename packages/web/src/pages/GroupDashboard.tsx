import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  type FeedSummary,
  getGroup,
  addFeed,
  removeFeed,
  calendarUrl,
} from "../lib/api.ts";
import CopyButton from "../components/CopyButton.tsx";

type Status = "loading" | "ready" | "error";

const Spinner = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
  </svg>
);

export default function GroupDashboard() {
  const { shareSecret } = useParams<{ shareSecret: string }>();
  const [status, setStatus] = useState<Status>("loading");
  const [feeds, setFeeds] = useState<FeedSummary[]>([]);
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formFilter, setFormFilter] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const shareLink = `${window.location.origin}/group/${shareSecret}`;
  const icsUrl = calendarUrl(shareSecret!);

  useEffect(() => {
    if (!shareSecret) return;
    getGroup(shareSecret)
      .then((g) => {
        setFeeds(g.feeds);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [shareSecret]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareSecret) return;
    setFormError(null);
    setSubmitting(true);
    try {
      const result = await addFeed(shareSecret, formName.trim(), formUrl.trim(), formFilter.trim() || undefined);
      setFeeds(result.feeds);
      setFormName("");
      setFormUrl("");
      setFormFilter("");
      nameRef.current?.focus();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add feed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (index: number) => {
    if (!shareSecret) return;
    setRemoving(index);
    try {
      const result = await removeFeed(shareSecret, index);
      setFeeds(result.feeds);
    } finally {
      setRemoving(null);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8 animate-spin text-terra-500" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-lg font-medium text-obsidian-900">Group not found.</p>
        <p className="text-obsidian-700/70">Check the link and try again.</p>
        <Link to="/" className="text-terra-500 underline hover:text-terra-600">
          Go home
        </Link>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-parchment-200 bg-white/80 px-3 py-2 text-sm text-obsidian-900 placeholder-obsidian-700/40 outline-none focus:border-terra-400 focus:ring-2 focus:ring-terra-100";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {/* Header */}
      <div className="mb-10 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <img src="/icon.png" alt="Mergical icon" className="size-10 drop-shadow-sm" />
          <span className="font-heading text-xl font-bold text-obsidian-900">Mergical</span>
        </Link>
      </div>

      <div className="space-y-6">
        {/* Share Link Card */}
        <section className="rounded-2xl bg-white/70 p-6 shadow-sm ring-1 ring-parchment-200">
          <h2 className="mb-1 font-heading text-lg font-semibold text-obsidian-900">
            Share this link with your family
          </h2>
          <p className="mb-4 text-sm text-obsidian-700/70">
            Anyone with this link can add their calendar and see the merged
            feed. Keep it safe — it's your only key.
          </p>
          <div className="flex items-center gap-2 rounded-lg bg-parchment-100 p-3 ring-1 ring-parchment-200">
            <span className="flex-1 truncate font-mono text-sm text-obsidian-800">
              {shareLink}
            </span>
            <CopyButton text={shareLink} label="Copy link" />
          </div>
        </section>

        {/* Add Calendar Card */}
        <section className="rounded-2xl bg-white/70 p-6 shadow-sm ring-1 ring-parchment-200">
          <h2 className="mb-1 font-heading text-lg font-semibold text-obsidian-900">
            Add your calendar
          </h2>
          <p className="mb-4 text-sm text-obsidian-700/70">
            Paste your iCal feed URL. You can find this in Google Calendar,
            Outlook, or Apple Calendar under sharing settings.
          </p>
          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-obsidian-800">
                Your name
              </label>
              <input
                ref={nameRef}
                id="name"
                type="text"
                placeholder="e.g. Jon"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="url" className="mb-1 block text-sm font-medium text-obsidian-800">
                iCal feed URL
              </label>
              <input
                id="url"
                type="url"
                placeholder="https://calendar.google.com/calendar/ical/…"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="filter" className="mb-1 block text-sm font-medium text-obsidian-800">
                Filter prefix{" "}
                <span className="font-normal text-obsidian-700/50">(optional)</span>
              </label>
              <input
                id="filter"
                type="text"
                placeholder="e.g. [shared] or 🏠"
                value={formFilter}
                onChange={(e) => setFormFilter(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-obsidian-700/50">
                Only events whose title starts with this text will be included.
                The prefix will be removed from the title in the shared calendar.
              </p>
            </div>
            {formError && (
              <p className="rounded-lg bg-terra-100 px-3 py-2 text-sm text-terra-700">
                {formError}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-terra-500 px-4 py-2.5 text-sm font-semibold text-parchment-50 transition hover:bg-terra-600 disabled:opacity-60 active:scale-95"
            >
              {submitting ? (
                <>
                  <Spinner className="size-4 animate-spin" />
                  Adding…
                </>
              ) : (
                "Add my calendar"
              )}
            </button>
          </form>
        </section>

        {/* Members List Card */}
        {feeds.length > 0 && (
          <section className="rounded-2xl bg-white/70 p-6 shadow-sm ring-1 ring-parchment-200">
            <h2 className="mb-4 font-heading text-lg font-semibold text-obsidian-900">
              Calendars in this group ({feeds.length})
            </h2>
            <ul className="space-y-2">
              {feeds.map((feed, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-parchment-100 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-ochre-100 font-heading text-xs font-bold text-ochre-400">
                      {feed.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-obsidian-900">
                        {feed.name}
                      </p>
                      <p className="text-xs text-obsidian-700/60">
                        Added{" "}
                        {new Date(feed.addedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {feed.filterPrefix && (
                          <>
                            {" · "}
                            <span className="rounded bg-ochre-100 px-1.5 py-0.5 font-mono text-ochre-500">
                              {feed.filterPrefix}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(i)}
                    disabled={removing === i}
                    className="rounded-lg p-1.5 text-obsidian-700/40 transition hover:bg-terra-100 hover:text-terra-600 disabled:opacity-40"
                    aria-label={`Remove ${feed.name}`}
                  >
                    {removing === i ? (
                      <Spinner className="size-4 animate-spin" />
                    ) : (
                      <svg className="size-4" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Subscribe Card */}
        <section className="rounded-2xl bg-gradient-to-br from-terra-600 to-obsidian-900 p-6 text-parchment-50 shadow-sm">
          <h2 className="mb-1 font-heading text-lg font-semibold">
            Subscribe to merged calendar
          </h2>
          <p className="mb-4 text-sm text-parchment-200/80">
            Add this URL to Google Calendar, Apple Calendar, or Outlook to see
            everyone's events in one place. It refreshes automatically.
          </p>
          <div className="flex items-center gap-2 rounded-lg bg-white/10 p-3 ring-1 ring-white/20">
            <span className="flex-1 truncate font-mono text-sm text-parchment-100">
              {icsUrl}
            </span>
            <CopyButton text={icsUrl} label="Copy URL" />
          </div>
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-parchment-200/70 hover:text-parchment-50">
              How to subscribe in your calendar app
            </summary>
            <ul className="mt-2 space-y-1 text-sm text-parchment-200/80">
              <li>
                <strong className="text-parchment-50">Google Calendar:</strong>{" "}
                Other calendars → + → From URL → paste above
              </li>
              <li>
                <strong className="text-parchment-50">Apple Calendar:</strong>{" "}
                File → New Calendar Subscription → paste above
              </li>
              <li>
                <strong className="text-parchment-50">Outlook:</strong>{" "}
                Add calendar → Subscribe from web → paste above
              </li>
            </ul>
          </details>
        </section>
      </div>
    </div>
  );
}
