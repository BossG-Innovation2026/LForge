"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function DeleteNotebookButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this lesson plan permanently?")) return;
    setDeleting(true);
    await fetch(`/api/notebooks/${id}`, { method: "DELETE" });
    startTransition(() => router.refresh());
    setDeleting(false);
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting || pending}
      aria-label="Delete lesson plan"
      className="rounded-lg border border-transparent px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
    >
      {deleting || pending ? "…" : "Delete"}
    </button>
  );
}
