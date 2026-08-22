"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewNotebookForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/notebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
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
    <form onSubmit={handleSubmit} className="flex w-full max-w-xl gap-2">
      <div className="flex-1">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Lesson plan topic, e.g. Photosynthesis - Grade 7"
          maxLength={200}
          className="lf-input !text-sm"
        />
        {error && (
          <p className="mt-2 font-mono text-xs uppercase tracking-wider text-red-400">
            {error}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={creating}
        className="shrink-0 rounded-none bg-[#00ff9c] px-5 py-2.5 font-mono text-sm font-semibold uppercase tracking-wider text-black shadow-[0_0_18px_rgba(0,255,156,0.25)] transition hover:bg-[#5cffbe] disabled:opacity-50"
      >
        {creating ? "Creating…" : "New lesson plan"}
      </button>
    </form>
  );
}
