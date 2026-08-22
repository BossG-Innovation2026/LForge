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
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            LF
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">LessonForge</h1>
        </div>
        <p className="text-sm text-slate-500">
          Upload sources and a lesson template — get a grounded, classroom-ready lesson plan.
        </p>
      </header>

      <section className="mb-12 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Start a new lesson plan
        </h2>
        <NewNotebookForm />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Your lesson plans
        </h2>
        {notebooks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white/50 px-6 py-10 text-center text-sm text-slate-400">
            No lesson plans yet. Create your first one above.
          </p>
        ) : (
          <ul className="space-y-3">
            {notebooks.map((nb) => (
              <li key={nb.id}>
                <div className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow">
                  <Link
                    href={`/notebook/${nb.id}`}
                    className="min-w-0 flex-1 outline-none"
                  >
                    <p className="truncate font-medium text-slate-900 group-hover:text-indigo-700">
                      {nb.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Updated {formatDate(nb.updatedAt)} ·{" "}
                      {nb.sourceCount === 1 ? "1 source" : `${nb.sourceCount} sources`}
                      {nb.hasTemplate ? " · template set" : " · no template"}
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
