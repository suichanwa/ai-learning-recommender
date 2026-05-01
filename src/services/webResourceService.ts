import type { Difficulty, ParsedLearningIntent, WebResource } from "@/lib/types";

interface SerperResponse {
  organic?: Array<{
    title?: string;
    link?: string;
    snippet?: string;
  }>;
}

interface TavilyResponse {
  results?: Array<{
    title?: string;
    url?: string;
    content?: string;
  }>;
}

interface BraveResponse {
  web?: {
    results?: Array<{
      title?: string;
      url?: string;
      description?: string;
    }>;
  };
}

const REQUEST_TIMEOUT_MS = 6500;

const curatedDocsByTopic: Record<string, WebResource[]> = {
  unity: [
    {
      title: "Unity Learn",
      snippet: "Official guided learning paths and beginner courses from Unity.",
      url: "https://learn.unity.com/",
      domain: "learn.unity.com",
      provider: "curated",
    },
    {
      title: "Unity Manual",
      snippet: "Official Unity engine documentation and editor manuals.",
      url: "https://docs.unity3d.com/Manual/index.html",
      domain: "docs.unity3d.com",
      provider: "curated",
    },
    {
      title: "Unity Scripting API",
      snippet: "Official API docs for Unity C# scripting.",
      url: "https://docs.unity3d.com/ScriptReference/",
      domain: "docs.unity3d.com",
      provider: "curated",
    },
  ],
  javascript: [
    {
      title: "MDN JavaScript Guide",
      snippet: "Authoritative JavaScript guide by Mozilla.",
      url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
      domain: "developer.mozilla.org",
      provider: "curated",
    },
    {
      title: "javascript.info",
      snippet: "Practical modern JavaScript tutorial from basics to advanced topics.",
      url: "https://javascript.info/",
      domain: "javascript.info",
      provider: "curated",
    },
  ],
};

function parseDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "unknown";
  }
}

function uniqueByUrl(items: WebResource[]): WebResource[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.url.split("#")[0];
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function githubPagesSearchResource(query: string): WebResource {
  return {
    title: "GitHub Pages learning sites",
    snippet: "Search tutorial websites hosted on GitHub Pages.",
    url: `https://duckduckgo.com/?q=${encodeURIComponent(`${query} site:github.io tutorial`)}`,
    domain: "duckduckgo.com",
    provider: "curated",
  };
}

function fallbackWebResources(topic: string, query: string): WebResource[] {
  const curated = curatedDocsByTopic[topic.toLowerCase()] ?? [];
  const officialDocsSearch: WebResource = {
    title: `${topic} Official Documentation Search`,
    snippet: "Search docs and high-quality tutorials for this topic.",
    url: `https://duckduckgo.com/?q=${encodeURIComponent(`${query} official docs tutorial`)}`,
    domain: "duckduckgo.com",
    provider: "curated",
  };
  return uniqueByUrl([...curated, githubPagesSearchResource(query), officialDocsSearch]);
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function searchSerper(query: string): Promise<WebResource[]> {
  const key = process.env.SERPER_API_KEY;
  if (!key) {
    return [];
  }
  const response = await fetchWithTimeout("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num: 8 }),
    next: { revalidate: 1800 },
  });
  if (!response.ok) {
    throw new Error(`Serper response ${response.status}`);
  }
  const data = (await response.json()) as SerperResponse;
  return (
    data.organic
      ?.map((entry) => {
        if (!entry.link || !entry.title) return null;
        return {
          title: entry.title,
          snippet: entry.snippet ?? "Web resource",
          url: entry.link,
          domain: parseDomain(entry.link),
          provider: "serper",
        } satisfies WebResource;
      })
      .filter((entry): entry is WebResource => entry !== null) ?? []
  );
}

async function searchTavily(query: string): Promise<WebResource[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) {
    return [];
  }
  const response = await fetchWithTimeout("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      max_results: 8,
      search_depth: "basic",
      topic: "general",
    }),
    next: { revalidate: 1800 },
  });
  if (!response.ok) {
    throw new Error(`Tavily response ${response.status}`);
  }
  const data = (await response.json()) as TavilyResponse;
  return (
    data.results
      ?.map((entry) => {
        if (!entry.url || !entry.title) return null;
        return {
          title: entry.title,
          snippet: entry.content ?? "Web resource",
          url: entry.url,
          domain: parseDomain(entry.url),
          provider: "tavily",
        } satisfies WebResource;
      })
      .filter((entry): entry is WebResource => entry !== null) ?? []
  );
}

async function searchBrave(query: string): Promise<WebResource[]> {
  const key = process.env.BRAVE_API_KEY;
  if (!key) {
    return [];
  }
  const endpoint = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=8&search_lang=en`;
  const response = await fetchWithTimeout(endpoint, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": key,
    },
    next: { revalidate: 1800 },
  });
  if (!response.ok) {
    throw new Error(`Brave response ${response.status}`);
  }
  const data = (await response.json()) as BraveResponse;
  return (
    data.web?.results
      ?.map((entry) => {
        if (!entry.url || !entry.title) return null;
        return {
          title: entry.title,
          snippet: entry.description ?? "Web resource",
          url: entry.url,
          domain: parseDomain(entry.url),
          provider: "brave",
        } satisfies WebResource;
      })
      .filter((entry): entry is WebResource => entry !== null) ?? []
  );
}

export async function fetchWebResources(
  topic: string,
  query: string,
): Promise<WebResource[]> {
  const providerCalls = [searchSerper, searchTavily, searchBrave];
  const queries = [query, `${query} site:github.io`];

  const collected: WebResource[] = [];
  for (const q of queries) {
    for (const provider of providerCalls) {
      try {
        const results = await provider(q);
        if (results.length > 0) {
          collected.push(...results);
        }
      } catch {
        // failover to next provider
      }
    }
  }

  return uniqueByUrl([...collected, ...fallbackWebResources(topic, query)]).slice(0, 15);
}

function tokenize(value: string): string[] {
  return value.toLowerCase().split(/[^a-z0-9+.#]+/).filter(Boolean);
}

function overlapScore(text: string, query: string): number {
  const q = tokenize(query);
  const t = new Set(tokenize(text));
  if (!q.length) {
    return 0;
  }
  const matched = q.filter((token) => t.has(token)).length;
  return matched / q.length;
}

export function rerankWebResourcesForIntent(
  items: WebResource[],
  intent: ParsedLearningIntent,
  difficulty: Difficulty,
): WebResource[] {
  const difficultyHints =
    difficulty === "Beginner"
      ? /(beginner|getting started|introduction|quickstart|fundamentals)/i
      : difficulty === "Advanced"
        ? /(advanced|architecture|optimization|internals|deep dive)/i
        : /(intermediate|guide|tutorial)/i;

  const authorityHints =
    /(docs\.|developer\.|official|learn\.|unity3d\.com|mozilla|react\.dev|nextjs\.org|microsoft|google)/i;

  const ranked = items
    .map((item) => {
      const text = `${item.title} ${item.snippet} ${item.domain}`;
      const relevance = overlapScore(text, intent.correctedInput);
      const queryMatch = intent.searchQueries.reduce((best, query) => Math.max(best, overlapScore(text, query)), 0);
      const beginnerSuitability = difficultyHints.test(text) ? 1 : 0.6;
      const authority = authorityHints.test(text) ? 1 : 0.65;
      const freshness = /\b(202[4-9]|203\d)\b/.test(text) ? 1 : 0.65;
      const score =
        relevance * 0.35 +
        queryMatch * 0.25 +
        beginnerSuitability * 0.15 +
        authority * 0.15 +
        freshness * 0.1;

      const whyPicked: string[] = [];
      if (relevance >= 0.4 || queryMatch >= 0.45) whyPicked.push("matched topic");
      if (beginnerSuitability >= 0.95) whyPicked.push("beginner-fit");
      if (authority >= 0.9) whyPicked.push("official docs");
      if (freshness >= 0.95) whyPicked.push("fresh");
      if (item.domain.endsWith("github.io")) whyPicked.push("github pages");
      if (whyPicked.length === 0) whyPicked.push("high relevance score");

      return {
        item: {
          ...item,
          score: Number(score.toFixed(2)),
          whyPicked,
        },
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  return ranked.map((entry) => entry.item).slice(0, 6);
}
