import CreateNotebookButton from "@/components/create-notebook-button";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 flex flex-col items-center justify-center">
      <header className="mb-10 text-center">
        <div className="mb-4 flex items-center justify-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-none border border-[var(--lf-accent)]/60 bg-[var(--lf-accent)]/10 font-mono text-sm font-bold text-[var(--lf-accent)] shadow-[0_0_18px_rgba(0,0,0,0.25)]">
            LF
          </span>
          <h1 className="font-mono text-2xl font-bold uppercase tracking-[0.18em]" style={{ color: "var(--lf-fg)" }}>
            LessonForge
          </h1>
        </div>
        <p className="font-mono text-xs tracking-wide text-zinc-500">
          Upload sources — get a grounded, classroom-ready ILAW lesson plan.
        </p>
      </header>

      <section className="lf-panel lf-frame relative w-full p-8">
        <h2 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--lf-accent)]/60">
          &gt; Welcome
        </h2>
        <p className="max-w-xl text-sm leading-relaxed text-zinc-300">
          LessonForge helps Filipino teachers create lesson plans aligned with the{" "}
          <span className="font-semibold" style={{ color: "var(--lf-accent)" }}>
            ILAW Framework
          </span>{" "}
          under DepEd Order No. 016, s. 2026 — the official replacement for the DLL and DLP.
          Add your reference materials, set your learning competency, and LessonForge
          drafts every ILAW section for you to review, refine, and approve before export.
        </p>
        <div className="mt-4 rounded-none border border-[var(--lf-accent)]/15 bg-[var(--lf-accent)]/5 px-4 py-3">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--lf-accent)]/70 mb-1.5">
            About ILAW
          </p>
          <p className="text-xs leading-relaxed text-zinc-400">
            ILAW (Inihanda, Laging Handa, Abot-Kaya, Wasto) replaces the traditional DLL and DLP
            with a streamlined, flexible planning system designed to reduce teacher paperwork
            while keeping lesson quality high. DO 016 s.2026 makes ILAW the standard for
            all public school teachers nationwide.
          </p>
        </div>
        <ul className="mt-4 space-y-1.5 font-mono text-[11px] text-zinc-500">
          <li className="flex items-center gap-2">
            <span className="text-[var(--lf-accent)]/60">→</span> Follows the official ILAW lesson plan sections
          </li>
          <li className="flex items-center gap-2">
            <span className="text-[var(--lf-accent)]/60">→</span> Each session is private and disappears after you download your plan
          </li>
          <li className="flex items-center gap-2">
            <span className="text-[var(--lf-accent)]/60">→</span> No account required
          </li>
          <li className="flex items-center gap-2">
            <span className="text-[var(--lf-accent)]/60">→</span> Multiple free AI providers supported
          </li>
        </ul>
        <div className="mt-6">
          <CreateNotebookButton />
        </div>
      </section>
    </div>
  );
}
