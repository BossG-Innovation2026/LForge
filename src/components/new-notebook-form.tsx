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
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
      <button
        type="submit"
        disabled={creating}
        className="shrink-0 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
      >
        {creating ? "Creating…" : "New lesson plan"}
      </button>
    </form>
  );
}
