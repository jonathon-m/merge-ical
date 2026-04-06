import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createGroup } from "../lib/api.ts";

const Spinner = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
  </svg>
);

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const { shareSecret } = await createGroup();
      navigate(`/group/${shareSecret}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-20">
      <div className="w-full max-w-lg text-center">
        <div className="mb-6 inline-block">
          <img
            src="/icon.png"
            alt="Mergical icon"
            className="size-28 drop-shadow-xl"
          />
        </div>

        <h1 className="mb-3 font-heading text-5xl font-black tracking-wide text-obsidian-900">
          Mergical
        </h1>
        <p className="mb-2 text-xl text-terra-600">
          Magically merge your family's calendars into one.
        </p>
        <p className="mb-10 text-obsidian-700/70">
          Create a group, share the secret link, and everyone adds their own
          calendar. One URL to subscribe to all of them.
        </p>

        {error && (
          <p className="mb-4 rounded-lg bg-terra-100 px-4 py-2 text-sm text-terra-700">
            {error}
          </p>
        )}

        <button
          onClick={handleCreate}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-terra-500 px-8 py-4 text-lg font-semibold text-parchment-50 shadow-md transition hover:bg-terra-600 disabled:opacity-60 active:scale-95"
        >
          {loading ? (
            <>
              <Spinner className="size-5 animate-spin" />
              Creating…
            </>
          ) : (
            <>
              <svg className="size-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              Create Calendar Group
            </>
          )}
        </button>

        <p className="mt-8 text-sm text-obsidian-700/50">
          No account needed. The link is the key — keep it safe.
        </p>
      </div>

      {/* How it works */}
      <div className="mt-20 w-full max-w-2xl">
        <h2 className="mb-8 text-center font-heading text-2xl font-bold text-obsidian-900">
          How it works
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              step: "1",
              title: "Create a group",
              desc: "Get a secret link unique to your family calendar group.",
            },
            {
              step: "2",
              title: "Share the link",
              desc: "Send the link to family. Each person adds their own iCal feed URL.",
            },
            {
              step: "3",
              title: "Subscribe once",
              desc: "Add the merged calendar URL to any calendar app and stay in sync.",
            },
          ].map(({ step, title, desc }) => (
            <div
              key={step}
              className="rounded-2xl bg-white/70 p-6 shadow-sm ring-1 ring-parchment-200"
            >
              <div className="mb-3 flex size-9 items-center justify-center rounded-full bg-ochre-100 font-heading text-sm font-bold text-ochre-400">
                {step}
              </div>
              <h3 className="mb-1 font-semibold text-obsidian-900">{title}</h3>
              <p className="text-sm text-obsidian-700/70">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
