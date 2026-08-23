import CreateNotebookButton from "@/components/create-notebook-button";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 flex flex-col items-center justify-center">
      <header className="mb-10 text-center">
        <div className="mb-4 flex items-center justify-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none border border-[var(--lf-accent)]/60 bg-[var(--lf-accent)]/10 font-mono text-sm font-bold text-[var(--lf-accent)] shadow-[0_0_18px_rgba(0,0,0,0.25)]">
            LF
          </span>
          <div className="flex flex-col justify-center text-left">
            <h1 className="font-mono text-2xl font-bold uppercase leading-none tracking-[0.18em]" style={{ color: "var(--lf-fg)" }}>
              LessonForge
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">BossG Innovations 2026</p>
          </div>
        </div>
        <p className="font-mono text-xs tracking-wide text-zinc-500">
          Forged by AI, Sharpened by Human Expertise
        </p>
      </header>

      <section className="lf-panel lf-frame relative w-full p-8">
        <p className="max-w-xl text-xs leading-relaxed text-zinc-400">
          Tempered in the fires of the ILAW Framework (DepEd Order No. 016, s. 2026).
          Mined from the ore you provide. From Intentions to Ways Forward, every draft
          is precision-forged and awaits your final strike.
        </p>
        <p className="max-w-xl text-xs leading-relaxed text-[var(--lf-accent)]/70 mt-3 font-semibold">
          Forged by AI. Sharpened by Teachers&apos; Expertise.
        </p>
        <p className="max-w-xl text-xs leading-relaxed text-[var(--lf-accent)]/70 mt-2 font-semibold">
          Retain absolute pedagogical authority: Review. Refine. Approve.
        </p>
        <div className="mt-6">
          <CreateNotebookButton />
        </div>
      </section>
    </div>
  );
}
