import { notFound } from "next/navigation";
import Link from "next/link";
import { getNotebook } from "@/lib/store";
import Workspace from "@/components/workspace";

export const dynamic = "force-dynamic";

export default async function NotebookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const notebook = await getNotebook(id);
  if (!notebook) {
    notFound();
  }
  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-slate-200 bg-white px-4 py-2.5">
        <Link
          href="/"
          className="text-sm font-medium text-slate-500 transition hover:text-indigo-600"
        >
          ← All lesson plans
        </Link>
      </header>
      <Workspace initialNotebook={notebook} />
    </div>
  );
}
