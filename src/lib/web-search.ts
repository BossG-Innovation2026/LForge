export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

export async function searchWeb(query: string, count = 3): Promise<SearchResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({ q: query, count: String(count), search_lang: "en" });
    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      web?: { results?: Array<{ title?: string; url?: string; description?: string }> };
    };
    return (data.web?.results ?? []).slice(0, count).map((r) => ({
      title: r.title ?? r.url ?? "Untitled",
      url: r.url ?? "",
      description: r.description ?? "",
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
