import { randomUUID } from "crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Notebook, NotebookSummary } from "./types";
import {
  OFFICIAL_TEMPLATE_FILE_NAME,
  officialTemplateSections,
} from "./official-template";

const KEY_PREFIX = "notebook:";

function safeId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

function keyFor(id: string): string {
  return `${KEY_PREFIX}${id}`;
}

async function kv(): Promise<KVNamespace> {
  const { env } = getCloudflareContext();
  const binding = env.NOTEBOOKS_KV;
  if (!binding) {
    throw new Error(
      "NOTEBOOKS_KV binding is not available. Make sure it is declared in wrangler.jsonc."
    );
  }
  return binding;
}

export function newId(): string {
  return randomUUID();
}

function toSummary(nb: Notebook): NotebookSummary {
  return {
    id: nb.id,
    title: nb.title,
    createdAt: nb.createdAt,
    updatedAt: nb.updatedAt,
    sourceCount: nb.sources.length,
    hasTemplate: nb.template !== null && nb.template.sections.length > 0,
    hasResult: nb.result !== null,
  };
}

export async function listNotebooks(): Promise<NotebookSummary[]> {
  const store = await kv();
  const result = await store.list<NotebookSummary>({ prefix: KEY_PREFIX });
  return result.keys
    .map((key) => key.metadata)
    .filter((m): m is NotebookSummary => m !== undefined)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createNotebook(title: string): Promise<Notebook> {
  const now = new Date().toISOString();
  const notebook: Notebook = {
    id: newId(),
    title: title.trim() || "Title",
    createdAt: now,
    updatedAt: now,
    sources: [],
    template: {
      fileName: "DepEd Lesson Plan Format (DO 016 s.2026 — ILAW Framework)",
      sections: officialTemplateSections(),
    },
    details: {},
    result: null,
  };
  await saveNotebook(notebook);
  return notebook;
}

export async function getNotebook(id: string): Promise<Notebook | null> {
  if (!safeId(id)) return null;
  try {
    const store = await kv();
    const raw = await store.get(keyFor(id));
    if (!raw) return null;
    const notebook = JSON.parse(raw) as Notebook;

    // Self-heal records created before the official-format migration.
    let healed = false;
    if (!notebook.template || notebook.template.sections.length === 0) {
      notebook.template = {
        fileName: OFFICIAL_TEMPLATE_FILE_NAME,
        sections: officialTemplateSections(),
      };
      healed = true;
    }
    if (!Array.isArray(notebook.sources)) {
      notebook.sources = [];
      healed = true;
    }
    if (healed) await saveNotebook(notebook);
    return notebook;
  } catch {
    return null;
  }
}

export async function saveNotebook(notebook: Notebook): Promise<void> {
  notebook.updatedAt = new Date().toISOString();
  const store = await kv();
  await store.put(keyFor(notebook.id), JSON.stringify(notebook), {
    metadata: toSummary(notebook),
  });
}

export async function deleteNotebook(id: string): Promise<boolean> {
  if (!safeId(id)) return false;
  const store = await kv();
  await store.delete(keyFor(id));
  return true;
}
