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
      <header className="border-b border-[#00ff9c]/15 bg-black/40 px-4 py-2.5">
        <Link
          href="/"
          className="font-mono text-xs uppercase tracking-[0.15em] text-zinc-400 transition hover:text-[#00ff9c]"
        >
          ← All lesson plans
        </Link>
      </header>
      <Workspace initialNotebook={notebook} />
    </div>
  );
}
