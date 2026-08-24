export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

export async function searchWeb(query: string, count = 3): Promise<SearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({ q: query, num: count, hl: "en", gl: "ph" }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      organic?: Array<{ title?: string; link?: string; snippet?: string }>;
    };
    return (data.organic ?? []).slice(0, count).map((r) => ({
      title: r.title ?? r.link ?? "Untitled",
      url: r.link ?? "",
      description: r.snippet ?? "",
    }));
  } catch {
    return [];
  }
}

export function searchResultsToSourceDocs(results: SearchResult[]): Array<{
  name: string;
  kind: "web";
  url: string;
  text: string;
}> {
  return results.map((r) => ({
    name: r.title,
    kind: "web" as const,
    url: r.url,
    text: `Title: ${r.title}\nURL: ${r.url}\nSummary: ${r.description}`,
  }));
}
