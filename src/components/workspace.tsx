"use client";

import { useRef, useState } from "react";
import type { Notebook, NotebookDetails, SourceKind } from "@/lib/types";
import { extractText } from "@/lib/client-extract";
import { DEFAULT_AI_DECLARATION } from "@/lib/official-template";

const ACCEPTED =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const COMPETENCY_SECTION_ID = "sec-1";

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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#00ff9c]/60">
      {children}
    </h2>
  );
}

function GhostButton({
  onClick,
  disabled,
  children,
  className = "",
}: {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-none border border-[#00ff9c]/25 px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-emerald-300 transition hover:border-[#00ff9c]/60 hover:bg-[#00ff9c]/10 hover:text-[#00ff9c] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
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
        <ol key={out.length} className="ml-5 list-decimal space-y-1 text-sm text-zinc-300">
          {items}
        </ol>
      ) : (
        <ul key={out.length} className="ml-5 list-disc space-y-1 text-sm text-zinc-300">
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
      <p key={out.length} className="text-sm leading-relaxed text-zinc-300">
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
  maxLength,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="lf-label mb-0.5 block">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          maxLength={maxLength}
          placeholder={placeholder}
          className="lf-input resize-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          placeholder={placeholder}
          className="lf-input"
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
  const competencySet = Boolean(details.competency?.trim());

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
      const sources: { name: string; kind: SourceKind; text?: string }[] = [];
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

  function detailsBody(): string {
    return JSON.stringify({
      competency: details.competency ?? "",
      learningArea: details.learningArea ?? "",
      teachers: details.teachers ?? "",
      gradeSection: details.gradeSection ?? "",
      sessions: details.sessions ?? "",
      references: details.references ?? "",
      aiDeclaration: details.aiDeclaration ?? "",
    });
  }

  async function saveDetails(): Promise<void> {
    setError(null);
    try {
      const data = await apiCall<{ notebook: Notebook }>(
        `/api/notebooks/${nb.id}/details`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: detailsBody(),
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
    if (
      approvedCount > 0 &&
      !confirm("Regenerating will replace the plan and clear all approvals. Continue?")
    ) {
      return;
    }
    setBusy("generate");
    setError(null);
    setFeedbackFor(null);
    try {
      // Persist current lesson details so generation runs against them.
      const saved = await apiCall<{ notebook: Notebook }>(
        `/api/notebooks/${nb.id}/details`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: detailsBody(),
        }
      );
      setNb(saved.notebook);

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
  const sectionSatisfied = (id: string): boolean =>
    approvedIds.has(id) || (id === COMPETENCY_SECTION_ID && competencySet);

  const totalSections = nb.template?.sections.length ?? nb.result?.sections.length ?? 0;
  const approvedCount = nb.template
    ? nb.template.sections.filter((t) => sectionSatisfied(t.id)).length
    : (nb.result?.sections ?? []).filter((s) => s.approvedAt).length;
  const allApproved = totalSections > 0 && approvedCount === totalSections;

  const genBlockReason =
    !nb.template || nb.template.sections.length === 0
      ? "Lesson format unavailable."
      : !competencySet
        ? "Set the Learning Competency & Curriculum Standards first - it anchors every section."
        : null;
  const canGenerate = !genBlockReason && !generating && busy !== "sources";

  return (
    <div className="flex min-h-0 w-full flex-1">
      {/* Sidebar */}
      <aside className="flex w-80 shrink-0 flex-col gap-6 overflow-y-auto border-r border-[#00ff9c]/15 bg-black/40 p-4">
        {/* Sources */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <SectionHeading>Sources ({nb.sources.length})</SectionHeading>
            <button
              onClick={() => sourceInputRef.current?.click()}
              disabled={busy !== null}
              className="rounded-none px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-[#00ff9c] transition hover:bg-[#00ff9c]/10 disabled:opacity-50"
            >
              {busy === "sources" ? (
                <span className="flex items-center gap-1.5">
                  <Spinner className="h-3 w-3" /> Uploading
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
                  className="group flex items-center gap-2 rounded-none border border-[#00ff9c]/15 bg-[#0a0f0c]/80 px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-zinc-300">
                    {s.name}
                  </span>
                  <span className="shrink-0 border border-[#00ff9c]/20 bg-[#00ff9c]/5 px-1.5 py-0.5 font-mono text-[10px] uppercase text-[#00ff9c]/70">
                    {s.kind}
                  </span>
                  <button
                    onClick={() => removeSource(s.id)}
                    disabled={busy !== null}
                    aria-label={`Remove ${s.name}`}
                    className="shrink-0 text-xs text-zinc-600 transition hover:text-red-400 disabled:opacity-50"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-none border border-dashed border-[#00ff9c]/20 bg-transparent px-3 py-4 text-center text-xs text-zinc-500">
              Add PDF or DOCX files to ground the lesson plan.
            </p>
          )}
        </section>

        {/* Format */}
        <section>
          <div className="mb-2">
            <SectionHeading>Format</SectionHeading>
          </div>
          <div className="lf-panel p-3">
            <p className="font-mono text-xs uppercase tracking-wider text-emerald-100">
              Official DepEd Lesson Plan
            </p>
            <p className="mt-0.5 font-mono text-[11px] tracking-wide text-zinc-500">
              DO 3 s.2026 · fixed form
            </p>
            <ol className="mt-2 space-y-1 border-l border-[#00ff9c]/25 pl-3">
              {nb.template?.sections.map((section) => (
                <li
                  key={section.id}
                  className={`text-xs leading-snug ${
                    section.id === COMPETENCY_SECTION_ID
                      ? "font-medium text-[#00ff9c]"
                      : "text-zinc-400"
                  }`}
                >
                  {section.title}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Lesson details */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <SectionHeading>Lesson details</SectionHeading>
            {detailsSaved && (
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#00ff9c]">
                Saved ✓
              </span>
            )}
          </div>

          {/* Competency - required standard */}
          <div className="lf-panel lf-frame relative mb-2 p-3">
            <label className="block">
              <span className="mb-0.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[#00ff9c]">
                Learning Competency &amp; Curriculum Standards{" "}
                <span aria-hidden="true">*</span>
              </span>
              {!competencySet && (
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-amber-400/90">
                  Required - anchors every generated section
                </span>
              )}
              <textarea
                value={details.competency ?? ""}
                onChange={(e) =>
                  setDetails((d) => ({ ...d, competency: e.target.value }))
                }
                rows={4}
                maxLength={2000}
                placeholder={"e.g. Describe the process of photosynthesis and explain its importance to living things."}
                className="lf-input resize-none"
              />
            </label>
          </div>

          <div className="lf-panel space-y-2 p-3">
            <DetailInput
              label="Learning Area/s"
              value={details.learningArea ?? ""}
              onChange={(v) => setDetails((d) => ({ ...d, learningArea: v }))}
              placeholder="e.g. Science"
              maxLength={500}
            />
            <DetailInput
              label="Name of Teacher/s"
              value={details.teachers ?? ""}
              onChange={(v) => setDetails((d) => ({ ...d, teachers: v }))}
              placeholder="Teacher name(s)"
              maxLength={500}
            />
            <DetailInput
              label="Grade Level and Section"
              value={details.gradeSection ?? ""}
              onChange={(v) => setDetails((d) => ({ ...d, gradeSection: v }))}
              placeholder="e.g. Grade 7 - Sampaguita"
              maxLength={500}
            />
            <DetailInput
              label="No. of Sessions"
              value={details.sessions ?? ""}
              onChange={(v) => setDetails((d) => ({ ...d, sessions: v }))}
              placeholder="e.g. 4"
              maxLength={200}
            />
            <DetailInput
              label="References"
              value={details.references ?? ""}
              onChange={(v) => setDetails((d) => ({ ...d, references: v }))}
              placeholder="Books, websites, toolkits…"
              maxLength={2000}
              multiline
            />
            <DetailInput
              label="Declaration of AI use"
              value={details.aiDeclaration ?? ""}
              onChange={(v) => setDetails((d) => ({ ...d, aiDeclaration: v }))}
              placeholder=""
              maxLength={4000}
              multiline
            />
            <button
              onClick={saveDetails}
              disabled={busy !== null}
              className="w-full rounded-none bg-[#00ff9c] px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-black shadow-[0_0_16px_rgba(0,255,156,0.2)] transition hover:bg-[#5cffbe] disabled:opacity-50"
            >
              Save lesson details
            </button>
          </div>
        </section>

        {warnings.length > 0 && (
          <div className="rounded-none border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="font-mono text-[11px] uppercase tracking-wider text-amber-400">
              Some files could not be added:
            </p>
            <ul className="mt-1 space-y-0.5">
              {warnings.map((w, i) => (
                <li key={i} className="text-[11px] leading-snug text-amber-300/80">
                  {w}
                </li>
              ))}
            </ul>
            <button
              onClick={() => setWarnings([])}
              className="mt-1.5 font-mono text-[11px] uppercase tracking-wider text-amber-400 underline"
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
              className="lf-input w-full px-2 py-1.5 !text-xl font-bold"
              aria-label="Lesson plan title"
            />
            <div className="flex shrink-0 flex-col items-end gap-1">
              <button
                onClick={exportDocx}
                disabled={!nb.result || !allApproved || busy !== null}
                title={
                  nb.result && !allApproved
                    ? `${approvedCount} of ${totalSections} sections ready`
                    : undefined
                }
                className={`shrink-0 rounded-none px-4 py-2 font-mono text-sm font-semibold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  allApproved
                    ? "bg-[#00ff9c] text-black shadow-[0_0_22px_rgba(0,255,156,0.3)] hover:bg-[#5cffbe]"
                    : "border border-[#00ff9c]/30 bg-transparent text-emerald-300 hover:border-[#00ff9c]/60 hover:text-[#00ff9c]"
                }`}
              >
                {busy === "export"
                  ? "Preparing…"
                  : allApproved
                    ? "Download final lesson plan"
                    : "Export DOCX"}
              </button>
              {nb.result && !allApproved && (
                <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                  {approvedCount} of {totalSections} ready
                </span>
              )}
            </div>
          </div>

          {/* Generate bar */}
          <div className="lf-panel lf-frame relative mb-6 p-4">
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              maxLength={4000}
              placeholder="Extra guidance for generation (optional): duration of the period, class profile, tone, things to emphasize…"
              className="lf-input resize-none px-3 py-2 !text-sm"
            />
            <div className="mt-3 flex items-center justify-between gap-4">
              <p className="min-w-0 text-xs text-zinc-500">
                {genBlockReason ?? (!hasSources
                  ? "No sources yet - the plan will rely on pedagogy only."
                  : undefined)}
              </p>
              <button
                onClick={generateAll}
                disabled={!canGenerate}
                className="shrink-0 rounded-none bg-[#00ff9c] px-5 py-2 font-mono text-sm font-semibold uppercase tracking-wider text-black shadow-[0_0_22px_rgba(0,255,156,0.3)] transition hover:bg-[#5cffbe] disabled:cursor-not-allowed disabled:shadow-none disabled:opacity-30"
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

          {/* Errors surface right where actions happen */}
          {error && (
            <div className="mb-6 rounded-none border border-red-500/40 bg-red-500/5 p-3">
              <p className="font-mono text-[11px] uppercase tracking-wider text-red-400">
                Error
              </p>
              <p className="mt-1 text-[13px] leading-snug text-red-300">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-1.5 font-mono text-[11px] uppercase tracking-wider text-red-400 underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Result */}
          {!nb.result ? (
            <div className="rounded-none border border-dashed border-[#00ff9c]/20 px-8 py-16 text-center">
              <p className="font-mono text-sm uppercase tracking-widest text-zinc-400">
                Your generated lesson plan will appear here
              </p>
              <p className="mt-2 font-mono text-xs tracking-wide text-zinc-600">
                1 &gt; Set the competency &nbsp;·&nbsp; 2 &gt; Add sources &nbsp;·&nbsp; 3
                &gt; Generate &nbsp;·&nbsp; 4 &gt; Approve each section
              </p>
            </div>
          ) : (
            <div className="space-y-4 pb-16">
              <div className="flex items-center justify-between gap-4">
                <p className="font-mono text-xs tracking-wide text-zinc-500">
                  Generated {new Date(nb.result.generatedAt).toLocaleString()} · grounded in{" "}
                  {hasSources
                    ? `${nb.sources.length} source${nb.sources.length === 1 ? "" : "s"}`
                    : "pedagogy only"}
                </p>
                <p className="shrink-0 font-mono text-xs uppercase tracking-wider text-zinc-400">
                  {approvedCount}/{totalSections} ready
                </p>
              </div>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={totalSections}
                aria-valuenow={approvedCount}
                className="h-1.5 w-full overflow-hidden rounded-none bg-[#00ff9c]/10"
              >
                <div
                  className={`h-full transition-all duration-300 ${
                    allApproved
                      ? "bg-[#00ff9c] shadow-[0_0_12px_rgba(0,255,156,0.7)]"
                      : "bg-[#00ff9c]/50"
                  }`}
                  style={{ width: `${totalSections ? (approvedCount / totalSections) * 100 : 0}%` }}
                />
              </div>
              {nb.result.sections.map((section) => {
                const isCompetency = section.sectionId === COMPETENCY_SECTION_ID;
                const isApproved = Boolean(section.approvedAt);
                if (isCompetency) {
                  return (
                    <article
                      key={section.sectionId}
                      className="lf-panel lf-frame relative border-[#00ff9c]/40 p-5 shadow-[0_0_30px_rgba(0,255,156,0.07)]"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <h2 className="font-semibold text-emerald-50">{section.title}</h2>
                        <span className="shrink-0 border border-[#00ff9c]/50 bg-[#00ff9c]/10 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[#00ff9c]">
                          Teacher standard · locked
                        </span>
                      </div>
                      <ContentBody content={section.content} />
                      <p className="mt-3 border-t border-[#00ff9c]/15 pt-3 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                        Authored by you in Lesson details - the AI builds every other
                        section on this standard.
                      </p>
                    </article>
                  );
                }
                return (
                <article
                  key={section.sectionId}
                  className={`rounded-none border bg-[#0a0f0c]/80 p-5 shadow-sm transition-colors ${
                    isApproved
                      ? "border-[#00ff9c]/45 shadow-[0_0_24px_rgba(0,255,156,0.06)]"
                      : "border-[#00ff9c]/15"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h2 className="font-semibold text-emerald-50">{section.title}</h2>
                    <div className="flex shrink-0 items-center gap-2">
                      {isApproved ? (
                        <>
                          <span className="border border-[#00ff9c]/50 bg-[#00ff9c]/10 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[#00ff9c]">
                            Approved ✓
                          </span>
                          <GhostButton
                            onClick={() => approveSection(section.sectionId)}
                            disabled={generating}
                          >
                            Un-approve
                          </GhostButton>
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
                            className="rounded-none px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-zinc-400 transition hover:bg-[#00ff9c]/10 hover:text-[#00ff9c] disabled:opacity-40"
                          >
                            Refine
                          </button>
                          <GhostButton
                            onClick={() => regenerateSection(section.sectionId, false)}
                            disabled={generating}
                            className="!text-emerald-300"
                          >
                            {sectionBusy === section.sectionId ? (
                              <Spinner className="mr-1 inline h-3 w-3" />
                            ) : null}
                            Regenerate
                          </GhostButton>
                          <button
                            onClick={() => approveSection(section.sectionId)}
                            disabled={generating || busy !== null}
                            className="flex items-center gap-1.5 rounded-none border border-[#00ff9c]/60 bg-[#00ff9c]/15 px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#00ff9c] transition hover:bg-[#00ff9c]/25 disabled:opacity-40"
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
                    <div className="mb-3 rounded-none border border-[#00ff9c]/25 bg-[#00ff9c]/5 p-3">
                      <textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        rows={2}
                        maxLength={2000}
                        placeholder="What should change in this section?"
                        className="lf-input resize-none !text-sm"
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          onClick={() => setFeedbackFor(null)}
                          className="rounded-none px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-zinc-400 hover:bg-white/5"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => regenerateSection(section.sectionId, true)}
                          disabled={!feedbackText.trim() || generating}
                          className="rounded-none bg-[#00ff9c] px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-black transition hover:bg-[#5cffbe] disabled:opacity-40"
                        >
                          Apply revision
                        </button>
                      </div>
                    </div>
                  )}

                  {sectionBusy === section.sectionId ? (
                    <div className="flex items-center gap-2 py-4 font-mono text-sm uppercase tracking-wider text-zinc-400">
                      <Spinner className="h-4 w-4 text-[#00ff9c]" />
                      Rewriting this section…
                    </div>
                  ) : (
                    <ContentBody content={section.content} />
                  )}

                  {section.sourceRefs.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#00ff9c]/10 pt-3">
                      {section.sourceRefs.map((ref) => (
                        <span
                          key={ref}
                          title={refName(ref)}
                          className="border border-[#00ff9c]/20 bg-[#00ff9c]/5 px-1.5 py-0.5 font-mono text-[10px] uppercase text-emerald-300/70"
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
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="lf-panel lf-frame relative flex flex-col items-center gap-3 px-8 py-6">
              <Spinner className="h-7 w-7 text-[#00ff9c]" />
              <p className="font-mono text-sm uppercase tracking-widest text-emerald-100">
                Generating your lesson plan…
              </p>
              <p className="max-w-xs text-center font-mono text-xs leading-relaxed text-zinc-500">
                Anchoring on your competency standards, reading sources and filling every
                template section. This usually takes under a minute.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
