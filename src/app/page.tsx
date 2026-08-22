import Link from "next/link";
import { listNotebooks } from "@/lib/store";
import NewNotebookForm from "@/components/new-notebook-form";
import DeleteNotebookButton from "@/components/delete-notebook-button";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function HomePage() {
  const notebooks = await listNotebooks();

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <header className="mb-10">
        <div className="mb-2 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-none border border-[#00ff9c]/60 bg-[#00ff9c]/10 font-mono text-sm font-bold text-[#00ff9c] shadow-[0_0_18px_rgba(0,255,156,0.25)]">
            LF
          </span>
          <h1 className="font-mono text-2xl font-bold uppercase tracking-[0.18em] text-emerald-50">
            LessonForge
          </h1>
        </div>
        <p className="font-mono text-xs tracking-wide text-zinc-500">
          Upload sources — get a grounded, classroom-ready DepEd lesson plan.
        </p>
      </header>

      <section className="lf-panel lf-frame relative mb-12 p-6">
        <h2 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00ff9c]/60">
          &gt; Start a new lesson plan
        </h2>
        <NewNotebookForm />
      </section>

      <section>
        <h2 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00ff9c]/60">
          &gt; Your lesson plans
        </h2>
        {notebooks.length === 0 ? (
          <p className="rounded-none border border-dashed border-[#00ff9c]/20 px-6 py-10 text-center font-mono text-xs tracking-wide text-zinc-500">
            No lesson plans yet. Create your first one above.
          </p>
        ) : (
          <ul className="space-y-3">
            {notebooks.map((nb) => (
              <li key={nb.id}>
                <div className="group flex items-center gap-3 rounded-none border border-[#00ff9c]/15 bg-[#0a0f0c]/80 p-4 transition hover:border-[#00ff9c]/50 hover:shadow-[0_0_22px_rgba(0,255,156,0.08)]">
                  <Link href={`/notebook/${nb.id}`} className="min-w-0 flex-1 outline-none">
                    <p className="truncate font-mono text-sm font-medium text-emerald-50 transition group-hover:text-[#00ff9c]">
                      {nb.title}
                    </p>
                    <p className="mt-1 font-mono text-xs tracking-wide text-zinc-500">
                      Updated {formatDate(nb.updatedAt)} ·{" "}
                      {nb.sourceCount === 1 ? "1 source" : `${nb.sourceCount} sources`}
                      {nb.hasTemplate ? " · official format" : ""}
                      {nb.hasResult ? " · plan generated" : ""}
                    </p>
                  </Link>
                  <DeleteNotebookButton id={nb.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
