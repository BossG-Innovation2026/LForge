"use client";

import { useRef, useState } from "react";
import type { Notebook, NotebookDetails } from "@/lib/types";
import { extractText } from "@/lib/client-extract";
import { DEFAULT_AI_DECLARATION } from "@/lib/official-template";

const ACCEPTED =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

function ContentBody({ content }: { content: string }) {
  const lines = content.split("\n");
  const out: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flush = () => {
    if (!list) return;
    const items = list.items.map((item, i) => <li key={i}>{item}</li>);
    out.push(
      list.ordered ? (
        <ol key={out.length} className="ml-5 list-decimal space-y-1 text-sm text-slate-700">
          {items}
        </ol>
      ) : (
        <ul key={out.length} className="ml-5 list-disc space-y-1 text-sm text-slate-700">
          {items}
        </ul>
      )
    );
    list = null;
  };

  for (const line of lines) {
    if (!line.trim()) {
      flush();
      continue;
    }
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    if (bullet) {
      if (!list || list.ordered) {
        flush();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (numbered) {
      if (!list || !list.ordered) {
        flush();
        list = { ordered: true, items: [] };
      }
      list.items.push(numbered[1]);
      continue;
    }
    flush();
    out.push(
      <p key={out.length} className="text-sm leading-relaxed text-slate-700">
        {line.trim()}
      </p>
    );
  }
  flush();
  return <div className="space-y-2">{out}</div>;
}

function DetailInput({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const shared =
    "w-full rounded border border-slate-200 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-400";
  return (
    <label className="block">
      <span className="mb-0.5 block text-[11px] font-medium text-slate-500">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          maxLength={4000}
          placeholder={placeholder}
          className={`${shared} resize-none`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={500}
          placeholder={placeholder}
          className={shared}
        />
      )}
    </label>
  );
}

export default function Workspace({ initialNotebook }: { initialNotebook: Notebook }) {
  const [nb, setNb] = useState<Notebook>(initialNotebook);
  const [title, setTitle] = useState(initialNotebook.title);

  const [busy, setBusy] = useState<null | "sources" | "generate" | "export">(null);
  const [sectionBusy, setSectionBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const [instructions, setInstructions] = useState("");
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");

  const [details, setDetails] = useState<NotebookDetails>({
    aiDeclaration: DEFAULT_AI_DECLARATION,
    ...initialNotebook.details,
  });
  const [detailsSaved, setDetailsSaved] = useState(false);

  const sourceInputRef = useRef<HTMLInputElement>(null);

  const generating = busy === "generate" || sectionBusy !== null;
  const hasSources = nb.sources.length > 0;

  async function reload(): Promise<void> {
    const data = await apiCall<{ notebook: Notebook }>(`/api/notebooks/${nb.id}`, {
      cache: "no-store",
    });
    setNb(data.notebook);
    setTitle(data.notebook.title);
  }

  function fail(err: unknown): void {
    setError(err instanceof Error ? err.message : String(err));
  }

  async function apiCall<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, init);
    if (!res.ok) {
      let message = `Request failed (${res.status}).`;
      try {
        const data = (await res.json()) as { error?: unknown };
        if (data && typeof data.error === "string") message = data.error;
      } catch {
        // non-JSON error body
      }
      throw new Error(message);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  /* ---------------- sources ---------------- */

  async function handleSourceUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy("sources");
    setError(null);
    setWarnings([]);
    const localWarnings: string[] = [];
    try {
      const sources: { name: string; kind: "pdf" | "docx"; text: string }[] = [];
      for (const file of Array.from(files)) {
        try {
          const extracted = await extractText(file);
          sources.push(extracted);
        } catch (err) {
          localWarnings.push(
            err instanceof Error ? err.message : `${file.name}: could not be read.`
          );
        }
      }
      if (sources.length > 0) {
        const data = await apiCall<{ notebook: Notebook; errors?: string[] }>(
          `/api/notebooks/${nb.id}/sources`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sources }),
          }
        );
        setNb(data.notebook);
        if (data.errors?.length) localWarnings.push(...data.errors);
      }
      setWarnings(localWarnings);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
      if (sourceInputRef.current) sourceInputRef.current.value = "";
    }
  }

  async function removeSource(sourceId: string) {
    setError(null);
    try {
      await apiCall<undefined>(`/api/notebooks/${nb.id}/sources/${sourceId}`, {
        method: "DELETE",
      });
      await reload();
    } catch (err) {
      fail(err);
    }
  }

  /* ---------------- lesson details ---------------- */

  async function saveDetails(): Promise<void> {
    setError(null);
    try {
      const data = await apiCall<{ notebook: Notebook }>(
        `/api/notebooks/${nb.id}/details`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            learningArea: details.learningArea ?? "",
            teachers: details.teachers ?? "",
            gradeSection: details.gradeSection ?? "",
            sessions: details.sessions ?? "",
            references: details.references ?? "",
            aiDeclaration: details.aiDeclaration ?? "",
          }),
        }
      );
      setNb(data.notebook);
      setDetails(data.notebook.details ?? {});
      setDetailsSaved(true);
      setTimeout(() => setDetailsSaved(false), 2000);
    } catch (err) {
      fail(err);
    }
  }

  /* ---------------- generation ---------------- */

  async function generateAll() {
    if (approvedCount > 0 && !confirm("Regenerating will replace the plan and clear all approvals. Continue?")) {
      return;
    }
    setBusy("generate");
    setError(null);
    setFeedbackFor(null);
    try {
      const data = await apiCall<{ notebook: Notebook }>("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notebookId: nb.id, instructions }),
      });
      setNb(data.notebook);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  }

  async function regenerateSection(sectionId: string, useFeedback: boolean) {
    setSectionBusy(sectionId);
    setError(null);
    try {
      const data = await apiCall<{ notebook: Notebook }>("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notebookId: nb.id,
          sectionId,
          instructions,
          feedback: useFeedback ? feedbackText : undefined,
        }),
      });
      setNb(data.notebook);
      setFeedbackFor(null);
      setFeedbackText("");
    } catch (err) {
      fail(err);
    } finally {
      setSectionBusy(null);
    }
  }

  async function approveSection(sectionId: string) {
    setSectionBusy(sectionId);
    setError(null);
    try {
      const data = await apiCall<{ notebook: Notebook }>(
        `/api/notebooks/${nb.id}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sectionId }),
        }
      );
      setNb(data.notebook);
      setFeedbackFor(null);
      setFeedbackText("");
    } catch (err) {
      fail(err);
    } finally {
      setSectionBusy(null);
    }
  }

  async function exportDocx() {
    setBusy("export");
    setError(null);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notebookId: nb.id }),
      });
      if (!res.ok) {
        let message = `Export failed (${res.status}).`;
        try {
          const data = (await res.json()) as { error?: unknown };
          if (data && typeof data.error === "string") message = data.error;
        } catch {
          // non-JSON error body
        }
        throw new Error(message);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^\w\d- ]+/g, "").trim().replace(/\s+/g, "-") || "lesson-plan"}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  }

  async function saveTitle() {
    const next = title.trim();
    if (!next || next === nb.title) return;
    try {
      const data = await apiCall<{ notebook: Notebook }>(`/api/notebooks/${nb.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: next }),
      });
      setNb(data.notebook);
      setTitle(data.notebook.title);
    } catch (err) {
      fail(err);
    }
  }

  /* ---------------- render ---------------- */

  const refName = (ref: string): string | undefined => {
    const m = ref.match(/^S(\d+)$/);
    if (!m) return undefined;
    return nb.sources[Number(m[1]) - 1]?.name;
  };

  const approvedIds = new Set(
    (nb.result?.sections ?? []).filter((s) => s.approvedAt).map((s) => s.sectionId)
  );
  const totalSections = nb.template?.sections.length ?? nb.result?.sections.length ?? 0;
  const approvedCount = nb.template
    ? nb.template.sections.filter((t) => approvedIds.has(t.id)).length
    : approvedIds.size;
  const allApproved = totalSections > 0 && approvedCount === totalSections;

  const canGenerate =
    nb.template !== null &&
    nb.template.sections.length > 0 &&
    !generating &&
    busy !== "sources";

  return (
    <div className="flex min-h-0 w-full flex-1">
      {/* Sidebar */}
      <aside className="flex w-80 shrink-0 flex-col gap-6 overflow-y-auto border-r border-slate-200 bg-slate-50 p-4">
        {/* Sources */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Sources ({nb.sources.length})
            </h2>
            <button
              onClick={() => sourceInputRef.current?.click()}
              disabled={busy !== null}
              className="rounded-md px-2 py-1 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-50"
            >
              {busy === "sources" ? (
                <span className="flex items-center gap-1.5">
                  <Spinner className="h-3 w-3" /> Uploading…
                </span>
              ) : (
                "+ Add files"
              )}
            </button>
          </div>
          <input
            ref={sourceInputRef}
            type="file"
            multiple
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => handleSourceUpload(e.target.files)}
          />
          {hasSources ? (
            <ul className="space-y-1.5">
              {nb.sources.map((s) => (
                <li
                  key={s.id}
                  className="group flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">
                    {s.name}
                  </span>
                  <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-400">
                    {s.kind}
                  </span>
                  <button
                    onClick={() => removeSource(s.id)}
                    disabled={busy !== null}
                    aria-label={`Remove ${s.name}`}
                    className="shrink-0 text-xs text-slate-300 transition hover:text-red-500 disabled:opacity-50"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-center text-xs text-slate-400">
              Add PDF or DOCX files to ground the lesson plan.
            </p>
          )}
        </section>

        {/* Format */}
        <section>
          <div className="mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Format
            </h2>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium text-slate-700">
              Official DepEd Lesson Plan
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">DO 3 s.2026 · fixed form</p>
            <ol className="mt-2 space-y-1 border-l-2 border-indigo-100 pl-3">
              {nb.template?.sections.map((section) => (
                <li key={section.id} className="text-xs leading-snug text-slate-600">
                  {section.title}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Lesson details */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Lesson details
            </h2>
            {detailsSaved && (
              <span className="text-[11px] font-medium text-emerald-600">Saved ✓</span>
            )}
          </div>
          <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
            <DetailInput
              label="Learning Area/s"
              value={details.learningArea ?? ""}
              onChange={(v) => setDetails((d) => ({ ...d, learningArea: v }))}
              placeholder="e.g. Science"
            />
            <DetailInput
              label="Name of Teacher/s"
              value={details.teachers ?? ""}
              onChange={(v) => setDetails((d) => ({ ...d, teachers: v }))}
              placeholder="Teacher name(s)"
            />
            <DetailInput
              label="Grade Level and Section"
              value={details.gradeSection ?? ""}
              onChange={(v) => setDetails((d) => ({ ...d, gradeSection: v }))}
              placeholder="e.g. Grade 7 - Sampaguita"
            />
            <DetailInput
              label="No. of Sessions"
              value={details.sessions ?? ""}
              onChange={(v) => setDetails((d) => ({ ...d, sessions: v }))}
              placeholder="e.g. 4"
            />
            <DetailInput
              label="References"
              value={details.references ?? ""}
              onChange={(v) => setDetails((d) => ({ ...d, references: v }))}
              placeholder="Books, websites, toolkits…"
              multiline
            />
            <DetailInput
              label="Declaration of AI use"
              value={details.aiDeclaration ?? ""}
              onChange={(v) => setDetails((d) => ({ ...d, aiDeclaration: v }))}
              placeholder=""
              multiline
            />
            <button
              onClick={saveDetails}
              disabled={busy !== null}
              className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              Save lesson details
            </button>
          </div>
        </section>

        {warnings.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-[11px] font-semibold text-amber-800">
              Some files could not be added:
            </p>
            <ul className="mt-1 space-y-0.5">
              {warnings.map((w, i) => (
                <li key={i} className="text-[11px] leading-snug text-amber-700">
                  {w}
                </li>
              ))}
            </ul>
            <button
              onClick={() => setWarnings([])}
              className="mt-1.5 text-[11px] font-medium text-amber-800 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-[11px] leading-snug text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-1.5 text-[11px] font-medium text-red-700 underline"
            >
              Dismiss
            </button>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="relative min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-8 py-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              className="w-full rounded-lg border border-transparent px-2 py-1.5 text-xl font-bold text-slate-900 outline-none transition hover:border-slate-200 focus:border-indigo-400"
              aria-label="Lesson plan title"
            />
            <div className="flex shrink-0 flex-col items-end gap-1">
              <button
                onClick={exportDocx}
                disabled={!nb.result || !allApproved || busy !== null}
                title={
                  nb.result && !allApproved
                    ? `${approvedCount} of ${totalSections} sections approved`
                    : undefined
                }
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  allApproved
                    ? "bg-emerald-600 text-white hover:bg-emerald-500"
                    : "border border-slate-300 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                {busy === "export" ? "Preparing…" : allApproved ? "Download final lesson plan" : "Export DOCX"}
              </button>
              {nb.result && !allApproved && (
                <span className="text-[11px] text-slate-400">
                  {approvedCount} of {totalSections} approved
                </span>
              )}
            </div>
          </div>

          {/* Generate bar */}
          <div className="mb-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              maxLength={4000}
              placeholder="Extra guidance for generation (optional): duration of the period, class profile, tone, things to emphasize…"
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
            />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                {!hasSources
                  ? "No sources yet - the plan will rely on pedagogy only."
                  : undefined}
              </p>
              <button
                onClick={generateAll}
                disabled={!canGenerate}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy === "generate" ? (
                  <span className="flex items-center gap-2">
                    <Spinner className="h-4 w-4" /> Generating…
                  </span>
                ) : nb.result ? (
                  "Regenerate plan"
                ) : (
                  "Generate lesson plan"
                )}
              </button>
            </div>
          </div>

          {/* Result */}
          {!nb.result ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white/50 px-8 py-16 text-center">
              <p className="text-sm font-medium text-slate-500">
                Your generated lesson plan will appear here.
              </p>
              <p className="mt-1 text-xs text-slate-400">
                1 · Add sources &nbsp; 2 · Generate &nbsp; 3 · Approve each section
              </p>
            </div>
          ) : (
            <div className="space-y-4 pb-16">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-slate-400">
                  Generated {new Date(nb.result.generatedAt).toLocaleString()} · grounded in{" "}
                  {hasSources
                    ? `${nb.sources.length} source${nb.sources.length === 1 ? "" : "s"}`
                    : "pedagogy only"}
                </p>
                <p className="shrink-0 text-xs font-medium text-slate-500">
                  {approvedCount} of {totalSections} approved
                </p>
              </div>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={totalSections}
                aria-valuenow={approvedCount}
                className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
              >
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    allApproved ? "bg-emerald-500" : "bg-indigo-500"
                  }`}
                  style={{ width: `${totalSections ? (approvedCount / totalSections) * 100 : 0}%` }}
                />
              </div>
              {nb.result.sections.map((section) => {
                const isApproved = Boolean(section.approvedAt);
                return (
                <article
                  key={section.sectionId}
                  className={`rounded-xl border bg-white p-5 shadow-sm transition-colors ${
                    isApproved ? "border-emerald-300" : "border-slate-200"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h2 className="font-semibold text-slate-900">{section.title}</h2>
                    <div className="flex shrink-0 items-center gap-2">
                      {isApproved ? (
                        <>
                          <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                            Approved ✓
                          </span>
                          <button
                            onClick={() => approveSection(section.sectionId)}
                            disabled={generating}
                            title="Allow editing this section again"
                            className="rounded-md px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
                          >
                            Un-approve
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setFeedbackFor(
                                feedbackFor === section.sectionId ? null : section.sectionId
                              );
                              setFeedbackText("");
                            }}
                            disabled={generating}
                            className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-40"
                          >
                            Refine
                          </button>
                          <button
                            onClick={() => regenerateSection(section.sectionId, false)}
                            disabled={generating}
                            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-40"
                          >
                            {sectionBusy === section.sectionId ? (
                              <Spinner className="h-3 w-3" />
                            ) : null}
                            Regenerate
                          </button>
                          <button
                            onClick={() => approveSection(section.sectionId)}
                            disabled={generating || busy !== null}
                            className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:opacity-40"
                          >
                            {sectionBusy === section.sectionId ? (
                              <Spinner className="h-3 w-3" />
                            ) : null}
                            Approve
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {feedbackFor === section.sectionId && (
                    <div className="mb-3 rounded-lg border border-indigo-200 bg-indigo-50/50 p-3">
                      <textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        rows={2}
                        maxLength={2000}
                        placeholder="What should change in this section?"
                        className="w-full resize-none rounded-lg border border-indigo-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          onClick={() => setFeedbackFor(null)}
                          className="rounded-md px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => regenerateSection(section.sectionId, true)}
                          disabled={!feedbackText.trim() || generating}
                          className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-indigo-500 disabled:opacity-40"
                        >
                          Apply revision
                        </button>
                      </div>
                    </div>
                  )}

                  {sectionBusy === section.sectionId ? (
                    <div className="flex items-center gap-2 py-4 text-sm text-slate-400">
                      <Spinner className="h-4 w-4 text-indigo-500" />
                      Rewriting this section…
                    </div>
                  ) : (
                    <ContentBody content={section.content} />
                  )}

                  {section.sourceRefs.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                      {section.sourceRefs.map((ref) => (
                        <span
                          key={ref}
                          title={refName(ref)}
                          className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500"
                        >
                          [{ref}] {refName(ref)}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Full-screen generation overlay */}
        {busy === "generate" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white px-8 py-6 shadow-lg">
              <Spinner className="h-7 w-7 text-indigo-600" />
              <p className="text-sm font-medium text-slate-700">
                Generating your lesson plan…
              </p>
              <p className="text-xs text-slate-400">
                Reading sources and filling every template section. This usually takes
                under a minute.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
