import { notFound } from "next/navigation";
import { getNotebook } from "@/lib/store";
import Workspace from "@/components/workspace";
import TicketGate from "@/components/ticket-gate";

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
    <TicketGate>
      <div className="flex h-screen flex-col">
        <Workspace initialNotebook={notebook} />
      </div>
    </TicketGate>
  );
}
