"use client";

import { useRef, useState } from "react";
import type { Notebook, NotebookDetails, SourceKind } from "@/lib/types";
import { extractText, SOURCE_ACCEPT } from "@/lib/client-extract";
import { AI_MODELS, DEFAULT_MODEL_ID, getProviderLabel, type AIModel } from "@/lib/ai-providers";
import SmolderButton from "@/components/smolder-button";

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
    <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: `color-mix(in srgb, var(--lf-accent), transparent 40%)` }}>
      {children}
    </h2>
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
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
  type?: string;
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
          type={type}
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

function DetailSummary({
  label,
  value,
  clamp = false,
}: {
  label: string;
  value?: string;
  clamp?: boolean;
}) {
  const text = value?.trim();
  return (
    <div>
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500">
        {label}
      </span>
      <p
        title={clamp && text ? text : undefined}
        className={`text-xs leading-snug text-zinc-300 ${
          clamp ? "line-clamp-4 whitespace-pre-line" : ""
        }`}
      >
        {text || "—"}
      </p>
    </div>
  );
}

const PROVIDER_GROUPS = Array.from(
  AI_MODELS.reduce((map, m) => {
    const list = map.get(m.provider) ?? [];
    list.push(m);
    map.set(m.provider, list);
    return map;
  }, new Map<string, AIModel[]>())
);

function ModelSelector({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = AI_MODELS.find((m) => m.id === value) ?? AI_MODELS[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className="flex w-full items-center justify-between gap-2 rounded-none border px-2.5 py-1.5 text-left transition disabled:opacity-50"
        style={{ borderColor: "color-mix(in srgb, var(--lf-accent), transparent 80%)", backgroundColor: "color-mix(in srgb, var(--lf-accent), transparent 97%)" }}
      >
        <div className="min-w-0">
          <p className="truncate font-mono text-xs font-medium text-emerald-100">
            {current.name}
          </p>
          <p className="font-mono text-[10px] text-zinc-500">
            {getProviderLabel(current.provider)}
            {current.free && (
              <span className="ml-1.5 border px-1 py-px" style={{ borderColor: "color-mix(in srgb, var(--lf-accent), transparent 70%)", backgroundColor: "color-mix(in srgb, var(--lf-accent), transparent 92%)", color: "color-mix(in srgb, var(--lf-accent), transparent 30%)" }}>
                free
              </span>
            )}
          </p>
        </div>
        <svg
          className={`h-3 w-3 shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 12 12"
          fill="currentColor"
        >
          <path d="M6 8L1 3h10L6 8z" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto border shadow-[0_8px_32px_rgba(0,0,0,0.6)]" style={{ borderColor: "color-mix(in srgb, var(--lf-accent), transparent 75%)", backgroundColor: "var(--lf-bg)" }}>
          {PROVIDER_GROUPS.map(([provider, models]) => (
            <div key={provider}>
              <div className="border-b px-2.5 py-1" style={{ borderColor: "color-mix(in srgb, var(--lf-accent), transparent 90%)", backgroundColor: "color-mix(in srgb, var(--lf-accent), transparent 95%)" }}>
                <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: "color-mix(in srgb, var(--lf-accent), transparent 40%)" }}>
                  {getProviderLabel(provider as AIModel["provider"])}
                </span>
              </div>
              {models.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onChange(m.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-start justify-between gap-2 px-2.5 py-2 text-left transition ${
                    m.id === value ? "bg-[var(--lf-accent)]/10" : ""
                  }`}
                  style={{ "--tw-bg-opacity": 0.1 } as React.CSSProperties}
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-emerald-100">{m.name}</p>
                    {m.note && (
                      <p className="font-mono text-[10px] text-zinc-500">{m.note}</p>
                    )}
                  </div>
                  {m.free && (
                    <span className="mt-0.5 shrink-0 border px-1 py-px font-mono text-[10px]" style={{ borderColor: "color-mix(in srgb, var(--lf-accent), transparent 70%)", backgroundColor: "color-mix(in srgb, var(--lf-accent), transparent 92%)", color: "color-mix(in srgb, var(--lf-accent), transparent 30%)" }}>
                      free
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Workspace({ initialNotebook }: { initialNotebook: Notebook }) {
  const [nb, setNb] = useState<Notebook>(initialNotebook);
  const [title, setTitle] = useState(initialNotebook.title);

  const [busy, setBusy] = useState<null | "sources" | "generate" | "export" | "link">(null);
  const [sectionBusy, setSectionBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const [instructions, setInstructions] = useState("");
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);

  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);

  const [details, setDetails] = useState<NotebookDetails>(
    initialNotebook.details ?? {}
  );
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [detailsEditing, setDetailsEditing] = useState(false);

  const sourceInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detailsRef = useRef(details);
  detailsRef.current = details;

  const generating = busy === "generate" || sectionBusy !== null;
  const hasSources = nb.sources.length > 0;
  const competencySet = Boolean(details.competency?.trim());
  const showDetailsForm = !nb.result || detailsEditing;

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
        setNb((prev) => ({ ...prev, sources: data.notebook.sources, template: data.notebook.template }));
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

  async function addLink() {
    const url = linkUrl.trim();
    if (!url) return;
    setBusy("link");
    setError(null);
    try {
      const data = await apiCall<{ notebook: Notebook }>(
        `/api/notebooks/${nb.id}/links`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        }
      );
      setNb((prev) => ({ ...prev, sources: data.notebook.sources }));
      setLinkUrl("");
      setShowLinkInput(false);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  }

  async function removeSource(sourceId: string) {
    setError(null);
    try {
      await apiCall<undefined>(`/api/notebooks/${nb.id}/sources/${sourceId}`, {
        method: "DELETE",
      });
      setNb((prev) => ({ ...prev, sources: prev.sources.filter((s) => s.id !== sourceId) }));
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
      position: details.position ?? "",
      gradeSection: details.gradeSection ?? "",
      sessions: details.sessions ?? "",
      date: details.date ?? "",
      learnerContext: details.learnerContext ?? "",
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

  async function saveDetailsFromRef(): Promise<void> {
    const d = detailsRef.current;
    try {
      await apiCall<{ notebook: Notebook }>(
        `/api/notebooks/${nb.id}/details`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            competency: d.competency ?? "",
            learningArea: d.learningArea ?? "",
            teachers: d.teachers ?? "",
            position: d.position ?? "",
            gradeSection: d.gradeSection ?? "",
            sessions: d.sessions ?? "",
            date: d.date ?? "",
            learnerContext: d.learnerContext ?? "",
          }),
        }
      );
      setDetailsSaved(true);
      setTimeout(() => setDetailsSaved(false), 2000);
    } catch (err) {
      fail(err);
    }
  }

  function scheduleAutoSave() {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveDetailsFromRef();
    }, 800);
  }

  function backToPlan(): void {
    setDetails(nb.details ?? {});
    setDetailsEditing(false);
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
        body: JSON.stringify({ notebookId: nb.id, instructions, modelId: selectedModel }),
      });
      setNb(data.notebook);
      setDetails(data.notebook.details ?? {});
      setDetailsEditing(false);
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
          modelId: selectedModel,
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

  async function approveAll() {
    setError(null);
    try {
      const data = await apiCall<{ notebook: Notebook }>(
        `/api/notebooks/${nb.id}/approve-all`,
        { method: "POST" }
      );
      setNb(data.notebook);
    } catch (err) {
      fail(err);
    }
  }

  async function saveSection(sectionId: string) {
    if (!editText.trim()) return;
    setSectionBusy(sectionId);
    setError(null);
    try {
      const data = await apiCall<{ notebook: Notebook }>(
        `/api/notebooks/${nb.id}/sections/${sectionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: editText }),
        }
      );
      setNb(data.notebook);
      setEditingSection(null);
      setEditText("");
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

      // Auto-delete the notebook after successful download
      try {
        await fetch(`/api/notebooks/${nb.id}`, { method: "DELETE" });
      } catch { /* best-effort */ }

      // Redirect back to home after a short delay so the user sees the download start
      setTimeout(() => { window.location.href = "/"; }, 1200);
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
      : null;
  const canGenerate = !genBlockReason && !generating && busy !== "sources";

  const unapprovedWithContent = nb.result?.sections.filter(
    (s) => !s.approvedAt && s.content && s.sectionId !== COMPETENCY_SECTION_ID
  ) ?? [];

  /* References panel */
  const referencesBlock = (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <SectionHeading>References ({nb.sources.length})</SectionHeading>
        <div className="flex items-center gap-1">
          <SmolderButton
            variant="muted"
            onClick={() => setShowLinkInput((v) => !v)}
            disabled={busy !== null}
            className="rounded-none px-2 py-1 font-mono text-[11px] uppercase tracking-wider"
          >
            + Link
          </SmolderButton>
          <SmolderButton
            variant="muted"
            onClick={() => sourceInputRef.current?.click()}
            disabled={busy !== null}
            className="rounded-none px-2 py-1 font-mono text-[11px] uppercase tracking-wider"
          >
            {busy === "sources" ? (
              <span className="flex items-center gap-1.5">
                <Spinner className="h-3 w-3" /> Uploading
              </span>
            ) : (
              "+ Files"
            )}
          </SmolderButton>
        </div>
      </div>

      {showLinkInput && (
        <div className="mb-2 flex gap-1.5">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addLink()}
            placeholder="https://..."
            className="lf-input min-w-0 flex-1"
            disabled={busy === "link"}
          />
          <SmolderButton
            variant="forge"
            onClick={addLink}
            disabled={!linkUrl.trim() || busy === "link"}
            className="shrink-0 rounded-none px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider"
          >
            {busy === "link" ? <Spinner className="h-3 w-3" /> : "Add"}
          </SmolderButton>
          <SmolderButton
            variant="muted"
            onClick={() => { setShowLinkInput(false); setLinkUrl(""); }}
            className="shrink-0 rounded-none px-1.5 py-1 font-mono text-[11px]"
          >
            ✕
          </SmolderButton>
        </div>
      )}

      <input
        ref={sourceInputRef}
        type="file"
        multiple
        accept={SOURCE_ACCEPT}
        className="hidden"
        onChange={(e) => handleSourceUpload(e.target.files)}
      />
      {hasSources ? (
        <ul className="space-y-1.5">
          {nb.sources.map((s) => (
            <li
              key={s.id}
              className="group flex items-center gap-2 rounded-none border px-3 py-2"
              style={{ borderColor: "color-mix(in srgb, var(--lf-accent), transparent 85%)", backgroundColor: "color-mix(in srgb, var(--lf-bg), transparent 20%)" }}
            >
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-zinc-300">
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--lf-accent)]">
                    {s.name}
                  </a>
                ) : s.name}
              </span>
              <span className="shrink-0 border px-1.5 py-0.5 font-mono text-[10px] uppercase" style={{ borderColor: "color-mix(in srgb, var(--lf-accent), transparent 80%)", backgroundColor: "color-mix(in srgb, var(--lf-accent), transparent 95%)", color: "color-mix(in srgb, var(--lf-accent), transparent 30%)" }}>
                {s.kind}
              </span>
              <SmolderButton
                variant="danger"
                onClick={() => removeSource(s.id)}
                disabled={busy !== null}
                aria-label={`Remove ${s.name}`}
                className="shrink-0 rounded-none px-1.5 py-0.5 font-mono text-[11px]"
              >
                ✕
              </SmolderButton>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-none border border-dashed px-3 py-4 text-center text-xs text-zinc-500" style={{ borderColor: "color-mix(in srgb, var(--lf-accent), transparent 80%)" }}>
          Add reference files or web links to ground the lesson plan.
        </p>
      )}
    </section>
  );

  return (
    <div className="flex min-h-0 w-full flex-1">
      {/* Sidebar */}
      <aside className="flex w-80 shrink-0 flex-col gap-6 overflow-y-auto border-r p-4" style={{ borderColor: "color-mix(in srgb, var(--lf-accent), transparent 85%)", backgroundColor: "rgba(0,0,0,0.4)" }}>
        {/* AI Model */}
        <section>
          <div className="mb-2">
            <SectionHeading>AI Model</SectionHeading>
          </div>
          <ModelSelector
            value={selectedModel}
            onChange={setSelectedModel}
            disabled={generating}
          />
          <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-zinc-600">
            All listed models are free. Set the matching API key in .env.local to use providers other than Gemini.
          </p>
        </section>

        {/* References */}
        {referencesBlock}

        {/* Lesson details - compact read-only summary once a plan exists */}
        {!showDetailsForm && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <SectionHeading>Lesson details</SectionHeading>
              <SmolderButton
                variant="ghost"
                onClick={() => setDetailsEditing(true)}
                disabled={busy !== null}
                className="rounded-none px-2 py-1 font-mono text-[11px] uppercase tracking-wider"
              >
                Edit
              </SmolderButton>
            </div>
            <div className="lf-panel space-y-2 p-3">
              <DetailSummary
                label="Learning Competency & Curriculum Standards"
                value={details.competency}
                clamp
              />
              <DetailSummary label="Subject" value={details.learningArea} />
              <DetailSummary label="Name of Teacher/s" value={details.teachers} />
              <DetailSummary label="Position / Designation" value={details.position} />
              <DetailSummary label="Grade Level and Section" value={details.gradeSection} />
              <DetailSummary label="No. of Sessions" value={details.sessions} />
              <DetailSummary label="Date" value={details.date} />
              <DetailSummary label="Learner Context" value={details.learnerContext} clamp />
              <SmolderButton
                variant="forge"
                onClick={generateAll}
                disabled={!canGenerate}
                className="w-full rounded-none px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wider"
              >
                {busy === "generate" ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <Spinner className="h-3 w-3" /> Regenerating…
                  </span>
                ) : (
                  "Strike It Now !!!"
                )}
              </SmolderButton>
            </div>
          </section>
        )}

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
            <SmolderButton
              variant="muted"
              onClick={() => setWarnings([])}
              className="mt-1.5 rounded-none px-0 py-0 font-mono text-[11px] uppercase tracking-wider text-amber-400 underline"
            >
              Dismiss
            </SmolderButton>
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
              aria-label="Specific topic of the lesson"
              placeholder="Write your specific topic here"
            />
            <div className="flex shrink-0 flex-col items-end gap-1">
              <SmolderButton
                variant="forge"
                onClick={exportDocx}
                disabled={!nb.result || !allApproved || busy !== null}
                title={
                  nb.result && !allApproved
                    ? `${approvedCount} of ${totalSections} sections ready`
                    : undefined
                }
                className="shrink-0 rounded-none px-4 py-2 font-mono text-sm font-semibold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy === "export"
                  ? "Preparing…"
                  : allApproved
                    ? "Get it now!"
                    : "Get it now!"}
              </SmolderButton>
              {nb.result && !allApproved && (
                <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                  {approvedCount} of {totalSections} ready
                </span>
              )}
            </div>
          </div>

          {/* Setup row - lesson details */}
          {showDetailsForm && (
            <div className="mb-6 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
              <section className="lg:col-span-2">
                <div className="mb-2 flex items-center justify-between">
                  <SectionHeading>Lesson details</SectionHeading>
                  <div className="flex items-center gap-3">
                    {nb.result && (
                      <SmolderButton
                        variant="muted"
                        onClick={backToPlan}
                        disabled={busy !== null}
                        className="rounded-none px-2 py-1 font-mono text-[11px] uppercase tracking-wider"
                      >
                        ← Back to plan
                      </SmolderButton>
                    )}
                  </div>
                </div>

                {/* Competency - required */}
                <div className="lf-panel lf-frame relative mb-2 p-3">
                  <label className="block">
                    <span className="mb-0.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--lf-accent)]">
                      Learning Competency &amp; Curriculum Standards{" "}
                      <span aria-hidden="true">*</span>
                    </span>
                    <textarea
                      value={details.competency ?? ""}
                      onChange={(e) => {
                        setDetails((d) => ({ ...d, competency: e.target.value }));
                        scheduleAutoSave();
                      }}
                      rows={4}
                      maxLength={2000}
                      placeholder="Write here the competency/ies from the curriculum guide that we are targeting, and the content or performance standards applicable to the sessions."
                      className="lf-input resize-none"
                    />
                  </label>
                </div>

                <div className="lf-panel space-y-2 p-3">
                  <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                    <DetailInput
                      label="Subject"
                      value={details.learningArea ?? ""}
                      onChange={(v) => { setDetails((d) => ({ ...d, learningArea: v })); scheduleAutoSave(); }}
                      placeholder="e.g. General Science"
                      maxLength={500}
                    />
                    <DetailInput
                      label="Name of Teacher/s"
                      value={details.teachers ?? ""}
                      onChange={(v) => { setDetails((d) => ({ ...d, teachers: v })); scheduleAutoSave(); }}
                      placeholder="Teacher name(s)"
                      maxLength={500}
                    />
                    <DetailInput
                      label="Position / Designation"
                      value={details.position ?? ""}
                      onChange={(v) => { setDetails((d) => ({ ...d, position: v })); scheduleAutoSave(); }}
                      placeholder="e.g. Teacher I"
                      maxLength={200}
                    />
                    <DetailInput
                      label="Grade Level and Section"
                      value={details.gradeSection ?? ""}
                      onChange={(v) => { setDetails((d) => ({ ...d, gradeSection: v })); scheduleAutoSave(); }}
                      placeholder="e.g. 11-Michelin"
                      maxLength={500}
                    />
                    <DetailInput
                      label="No. of Sessions"
                      value={details.sessions ?? ""}
                      onChange={(v) => { setDetails((d) => ({ ...d, sessions: v })); scheduleAutoSave(); }}
                      placeholder="e.g. 4"
                      maxLength={200}
                    />
                    <DetailInput
                      label="Date"
                      value={details.date ?? ""}
                      onChange={(v) => { setDetails((d) => ({ ...d, date: v })); scheduleAutoSave(); }}
                      placeholder="e.g. August 25, 2026"
                      maxLength={100}
                    />
                  </div>
                  <div className="mt-2">
                    <DetailInput
                      label="Learner Context"
                      value={details.learnerContext ?? ""}
                      onChange={(v) => { setDetails((d) => ({ ...d, learnerContext: v })); scheduleAutoSave(); }}
                      placeholder="Describe your learners' strengths, interests, recent performance, and possible barriers to learning."
                      maxLength={2000}
                      multiline
                    />
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* Generate bar */}
          {showDetailsForm && (
            <div className="lf-panel lf-frame relative mb-6 p-4">
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={2}
                maxLength={4000}
                placeholder="Write your specific instructions and add-on."
                className="lf-input resize-none px-3 py-2 !text-sm"
              />
            </div>
          )}

          {/* Strike It Now - full two-column width */}
          {showDetailsForm && (
            <div className="mb-6">
              <SmolderButton
                variant="forge"
                onClick={generateAll}
                disabled={!canGenerate}
                className="w-full rounded-none px-6 py-4 font-mono text-base font-bold uppercase tracking-widest disabled:cursor-not-allowed disabled:shadow-none disabled:opacity-30"
              >
                {busy === "generate" ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner className="h-4 w-4" /> Generating…
                  </span>
                ) : (
                  "Strike It Now !!!"
                )}
              </SmolderButton>
            </div>
          )}

          {/* Errors */}
          {error && (
            <div className="mb-6 rounded-none border border-red-500/40 bg-red-500/5 p-3">
              <p className="font-mono text-[11px] uppercase tracking-wider text-red-400">
                Error
              </p>
              <p className="mt-1 text-[13px] leading-snug text-red-300">{error}</p>
              <SmolderButton
                variant="muted"
                onClick={() => setError(null)}
                className="mt-1.5 rounded-none px-0 py-0 font-mono text-[11px] uppercase tracking-wider text-red-400 underline"
              >
                Dismiss
              </SmolderButton>
            </div>
          )}

          {/* Result */}
          {nb.result && !showDetailsForm && (
            <div className="space-y-4 pb-16">
              <div className="flex items-center justify-between gap-4">
                <p className="font-mono text-xs tracking-wide text-zinc-500">
                  Generated {new Date(nb.result.generatedAt).toLocaleString()} · grounded in{" "}
                  {hasSources
                    ? `${nb.sources.length} reference${nb.sources.length === 1 ? "" : "s"}`
                    : "pedagogy only"}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  {unapprovedWithContent.length > 0 && (
                    <SmolderButton
                      variant="forge"
                      onClick={approveAll}
                      disabled={generating || busy !== null}
                      className="rounded-none px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider"
                    >
                      Approve all
                    </SmolderButton>
                  )}
                  <p className="font-mono text-xs uppercase tracking-wider text-zinc-400">
                    {approvedCount}/{totalSections} ready
                  </p>
                </div>
              </div>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={totalSections}
                aria-valuenow={approvedCount}
                className="h-1.5 w-full overflow-hidden rounded-none"
                style={{ backgroundColor: "color-mix(in srgb, var(--lf-accent), transparent 90%)" }}
              >
                <div
                  className={`h-full transition-all duration-300 ${
                    allApproved
                      ? "bg-[var(--lf-accent)] shadow-[0_0_12px_rgba(0,255,156,0.7)]"
                      : "bg-[var(--lf-accent)]/50"
                  }`}
                  style={{ width: `${totalSections ? (approvedCount / totalSections) * 100 : 0}%` }}
                />
              </div>

              {nb.result.sections.map((section) => {
                const isCompetency = section.sectionId === COMPETENCY_SECTION_ID;
                const isApproved = Boolean(section.approvedAt);
                const isEditingThis = editingSection === section.sectionId;

                if (isCompetency) {
                  return (
                    <article
                      key={section.sectionId}
                      className="lf-panel lf-frame relative border p-5 shadow-[0_0_30px_rgba(0,255,156,0.07)]"
                      style={{ borderColor: "color-mix(in srgb, var(--lf-accent), transparent 60%)" }}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <h2 className="font-semibold text-emerald-50">{section.title}</h2>
                        <span className="shrink-0 border px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--lf-accent)]" style={{ borderColor: "color-mix(in srgb, var(--lf-accent), transparent 50%)", backgroundColor: "color-mix(in srgb, var(--lf-accent), transparent 90%)" }}>
                          Teacher standard · locked
                        </span>
                      </div>
                      <ContentBody content={section.content} />
                      <p className="mt-3 border-t pt-3 font-mono text-[11px] uppercase tracking-wider text-zinc-500" style={{ borderColor: "color-mix(in srgb, var(--lf-accent), transparent 85%)" }}>
                        Authored by you in Lesson details - the AI builds every other section on this standard.
                      </p>
                    </article>
                  );
                }

                return (
                  <article
                    key={section.sectionId}
                    className={`rounded-none border p-5 shadow-sm transition-colors ${
                      isApproved
                        ? "border-[var(--lf-accent)]/45 shadow-[0_0_24px_rgba(0,255,156,0.06)]"
                        : "border-[var(--lf-accent)]/15"
                    }`}
                    style={{ backgroundColor: "color-mix(in srgb, var(--lf-bg), transparent 20%)" }}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h2 className="font-semibold text-emerald-50">{section.title}</h2>
                      <div className="flex shrink-0 items-center gap-2">
                        {isApproved ? (
                          <>
                            <span className="border px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--lf-accent)]" style={{ borderColor: "color-mix(in srgb, var(--lf-accent), transparent 50%)", backgroundColor: "color-mix(in srgb, var(--lf-accent), transparent 90%)" }}>
                              Approved ✓
                            </span>
                            <SmolderButton
                              variant="ghost"
                              onClick={() => approveSection(section.sectionId)}
                              disabled={generating}
                              className="rounded-none px-2 py-1 font-mono text-[11px] uppercase tracking-wider"
                            >
                              Un-approve
                            </SmolderButton>
                          </>
                        ) : (
                          <>
                            <SmolderButton
                              variant="muted"
                              onClick={() => {
                                if (isEditingThis) {
                                  setEditingSection(null);
                                  setEditText("");
                                } else {
                                  setEditingSection(section.sectionId);
                                  setEditText(section.content);
                                  setFeedbackFor(null);
                                }
                              }}
                              disabled={generating}
                              className="rounded-none px-2 py-1 font-mono text-[11px] uppercase tracking-wider"
                            >
                              {isEditingThis ? "Cancel edit" : "Edit"}
                            </SmolderButton>
                            <SmolderButton
                              variant="muted"
                              onClick={() => {
                                setFeedbackFor(
                                  feedbackFor === section.sectionId ? null : section.sectionId
                                );
                                setFeedbackText("");
                                setEditingSection(null);
                              }}
                              disabled={generating}
                              className="rounded-none px-2 py-1 font-mono text-[11px] uppercase tracking-wider"
                            >
                              Refine
                            </SmolderButton>
                            <SmolderButton
                              variant="ghost"
                              onClick={() => regenerateSection(section.sectionId, false)}
                              disabled={generating}
                              className="rounded-none px-2 py-1 font-mono text-[11px] uppercase tracking-wider !text-emerald-300"
                            >
                              {sectionBusy === section.sectionId ? (
                                <Spinner className="mr-1 inline h-3 w-3" />
                              ) : null}
                              Regenerate
                            </SmolderButton>
                            <SmolderButton
                              variant="forge"
                              onClick={() => approveSection(section.sectionId)}
                              disabled={generating || busy !== null}
                              className="flex items-center gap-1.5 rounded-none px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider"
                            >
                              {sectionBusy === section.sectionId ? (
                                <Spinner className="h-3 w-3" />
                              ) : null}
                              Approve
                            </SmolderButton>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Inline editor */}
                    {isEditingThis && (
                      <div className="mb-3 rounded-none border p-3" style={{ borderColor: "color-mix(in srgb, var(--lf-accent), transparent 75%)", backgroundColor: "color-mix(in srgb, var(--lf-accent), transparent 95%)" }}>
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={8}
                          className="lf-input resize-y !text-sm"
                          placeholder="Edit section content…"
                        />
                        <div className="mt-2 flex justify-end gap-2">
                          <SmolderButton
                            variant="muted"
                            onClick={() => { setEditingSection(null); setEditText(""); }}
                            className="rounded-none px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider"
                          >
                            Cancel
                          </SmolderButton>
                          <SmolderButton
                            variant="forge"
                            onClick={() => saveSection(section.sectionId)}
                            disabled={!editText.trim() || sectionBusy === section.sectionId}
                            className="rounded-none px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider"
                          >
                            {sectionBusy === section.sectionId ? (
                              <Spinner className="mr-1 inline h-3 w-3" />
                            ) : null}
                            Save edits
                          </SmolderButton>
                        </div>
                      </div>
                    )}

                    {/* Refine with feedback */}
                    {feedbackFor === section.sectionId && (
                      <div className="mb-3 rounded-none border p-3" style={{ borderColor: "color-mix(in srgb, var(--lf-accent), transparent 75%)", backgroundColor: "color-mix(in srgb, var(--lf-accent), transparent 95%)" }}>
                        <textarea
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          rows={2}
                          maxLength={2000}
                          placeholder="What should change in this section?"
                          className="lf-input resize-none !text-sm"
                        />
                        <div className="mt-2 flex justify-end gap-2">
                          <SmolderButton
                            variant="muted"
                            onClick={() => setFeedbackFor(null)}
                            className="rounded-none px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider"
                          >
                            Cancel
                          </SmolderButton>
                          <SmolderButton
                            variant="forge"
                            onClick={() => regenerateSection(section.sectionId, true)}
                            disabled={!feedbackText.trim() || generating}
                            className="rounded-none px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider"
                          >
                            Apply revision
                          </SmolderButton>
                        </div>
                      </div>
                    )}

                    {sectionBusy === section.sectionId && !isEditingThis ? (
                      <div className="flex items-center gap-2 py-4 font-mono text-sm uppercase tracking-wider text-zinc-400">
                        <Spinner className="h-4 w-4 text-[var(--lf-accent)]" />
                        Rewriting this section…
                      </div>
                    ) : !isEditingThis ? (
                      <ContentBody content={section.content} />
                    ) : null}

                    {section.sourceRefs.length > 0 && !isEditingThis && (
                      <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3" style={{ borderColor: "color-mix(in srgb, var(--lf-accent), transparent 90%)" }}>
                        {section.sourceRefs.map((ref) => (
                          <span
                            key={ref}
                            title={refName(ref)}
                            className="border px-1.5 py-0.5 font-mono text-[10px] uppercase text-emerald-300/70"
                            style={{ borderColor: "color-mix(in srgb, var(--lf-accent), transparent 80%)", backgroundColor: "color-mix(in srgb, var(--lf-accent), transparent 95%)" }}
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
              <Spinner className="h-7 w-7 text-[var(--lf-accent)]" />
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
