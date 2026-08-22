import { NextRequest, NextResponse } from "next/server";
import { getNotebook, newId, saveNotebook } from "@/lib/store";
import type { SourceDoc } from "@/lib/types";
import { jsonError } from "@/lib/http";

interface Ctx {
  params: Promise<{ id: string }>;
}

const MAX_SOURCE_CHARS = 400_000;
const MIN_TEXT_CHARS = 200;
const MAX_TOTAL_SOURCES = 20;

const BLOCK_TAGS = new Set([
  "p", "div", "br", "h1", "h2", "h3", "h4", "h5", "h6", "li", "tr",
  "section", "article", "header", "footer", "blockquote", "pre", "table",
]);

const SKIP_TAGS = new Set(["script", "style", "noscript", "svg", "template"]);

class TextCollector {
  lines: string[] = [];

  element(el: Element): void {
    const tag = el.tagName.toLowerCase();
    if (SKIP_TAGS.has(tag)) {
      el.setInnerContent("");
      el.remove();
      return;
    }
    if (BLOCK_TAGS.has(tag)) {
      this.lines.push("\n");
    }
  }

  text(t: Text): void {
    this.lines.push(t.text);
  }
}

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h.endsWith(".local") ||
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^169\.254\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h)
  );
}

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const notebook = await getNotebook(id);
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found." }, { status: 404 });
    }
    if (notebook.sources.length >= MAX_TOTAL_SOURCES) {
      return NextResponse.json(
        { error: `Source limit reached (${MAX_TOTAL_SOURCES} per lesson plan).` },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
    const rawUrl = typeof body?.url === "string" ? body.url.trim() : "";
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("protocol");
      }
    } catch {
      return NextResponse.json(
        { error: "Enter a valid http(s) web link." },
        { status: 400 }
      );
    }
    if (isBlockedHost(parsed.hostname)) {
      return NextResponse.json(
        { error: "This address cannot be added as a source." },
        { status: 400 }
      );
    }

    let res: Response;
    try {
      res = await fetch(parsed.toString(), {
        redirect: "follow",
        signal: AbortSignal.timeout(15_000),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; LessonForge/1.0; +https://lessonforge.dev)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } catch {
      return NextResponse.json(
        { error: `${parsed.hostname}: could not be reached.` },
        { status: 502 }
      );
    }
    if (!res.ok) {
      return NextResponse.json(
        { error: `${parsed.hostname}: server responded ${res.status}.` },
        { status: 502 }
      );
    }
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("html")) {
      return NextResponse.json(
        { error: `${parsed.hostname}: only web pages (HTML) can be added as sources.` },
        { status: 400 }
      );
    }

    const collector = new TextCollector();
    const titleBox = { text: "" };
    const rewritten = new HTMLRewriter()
      .on("title", {
        text(t) {
          titleBox.text += t.text;
        },
      })
      .on("*", collector)
      .transform(res);
    await rewritten.arrayBuffer();

    let text = collector.lines.join(" ").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").replace(/\n{2,}/g, "\n").trim();
    const pageTitle = titleBox.text.replace(/\s+/g, " ").trim();

    if (text.length > MAX_SOURCE_CHARS) {
      text = `${text.slice(0, MAX_SOURCE_CHARS)}\n[text truncated]`;
    }
    if (text.length < MIN_TEXT_CHARS) {
      return NextResponse.json(
        {
          error: `${parsed.hostname}: no readable page text found (the site may require JavaScript or block automated access).`,
        },
        { status: 422 }
      );
    }

    const source: SourceDoc = {
      id: newId(),
      name: (pageTitle || parsed.hostname).slice(0, 255),
      kind: "web",
      text,
      chars: Math.min(text.length, MAX_SOURCE_CHARS),
      addedAt: new Date().toISOString(),
      url: parsed.toString(),
    };
    notebook.sources.push(source);
    await saveNotebook(notebook);

    return NextResponse.json({ notebook, source });
  } catch (error) {
    return jsonError(error);
  }
}
