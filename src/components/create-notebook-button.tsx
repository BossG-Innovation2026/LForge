"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateNotebookButton() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/notebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as {
        notebook?: { id: string };
        error?: string;
      };
      if (!res.ok || !data.notebook) {
        throw new Error(data.error ?? "Could not create the lesson plan.");
      }
      router.push(`/notebook/${data.notebook.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={handleClick}
        disabled={creating}
        className="w-full rounded-none bg-[#00ff9c] px-8 py-4 font-mono text-sm font-semibold uppercase tracking-wider text-black shadow-[0_0_22px_rgba(0,255,156,0.3)] transition hover:bg-[#5cffbe] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {creating ? (
          <span className="flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Creating…
          </span>
        ) : (
          "Smash it"
        )}
      </button>
      {error && (
        <p className="font-mono text-xs uppercase tracking-wider text-red-400">{error}</p>
      )}
    </div>
  );
}
