import type { Difficulty, ParsedLearningIntent, WebResource } from "@/lib/types";

interface SerperResponse {
  organic?: Array<{
    title?: string;
    link?: string;
    snippet?: string;
  }>;
}

const curatedDocsByTopic: Record<string, WebResource[]> = {
  unity: [
    {
      title: "Unity Learn",
      snippet: "Official guided learning paths and beginner courses from Unity.",
      url: "https://learn.unity.com/",
      domain: "learn.unity.com",
    },
    {
      title: "Unity Manual",
      snippet: "Official Unity engine documentation and editor manuals.",
      url: "https://docs.unity3d.com/Manual/index.html",
      domain: "docs.unity3d.com",
    },
    {
      title: "Unity Scripting API",
      snippet: "Official API docs for Unity C# scripting.",
      url: "https://docs.unity3d.com/ScriptReference/",
      domain: "docs.unity3d.com",
    },
  ],
  javascript: [
    {
      title: "MDN JavaScript Guide",
      snippet: "Authoritative JavaScript guide by Mozilla.",
      url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
      domain: "developer.mozilla.org",
    },
    {
      title: "javascript.info",
      snippet: "Practical modern JavaScript tutorial from basics to advanced topics.",
      url: "https://javascript.info/",
      domain: "javascript.info",
    },
  ],
};

function uniqueByUrl(items: WebResource[]): WebResource[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.url)) {
      return false;
    }
    seen.add(item.url);
    return true;
  });
}

function fallbackWebResources(topic: string, query: string): WebResource[] {
  const curated = curatedDocsByTopic[topic.toLowerCase()] ?? [];
  const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(`${query} official docs tutorial`)}`;
  return uniqueByUrl([
    ...curated,
    {
      title: `${topic} Official Documentation Search`,
      snippet: "Search docs and high-quality tutorials for this topic.",
      url: searchUrl,
      domain: "duckduckgo.com",
    },
  ]);
}

function parseDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "unknown";
  }
}

export async function fetchWebResources(
  topic: string,
  query: string,
): Promise<WebResource[]> {
  const serperKey = process.env.SERPER_API_KEY;
  if (!serperKey) {
    return fallbackWebResources(topic, query);
  }

  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": serperKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: 8,
      }),
      next: {
        revalidate: 1800,
      },
    });

    if (!response.ok) {
      throw new Error(`Serper response ${response.status}`);
    }

    const data = (await response.json()) as SerperResponse;
    const resources =
      data.organic
        ?.map((entry) => {
          if (!entry.link || !entry.title) {
            return null;
          }
          return {
            title: entry.title,
            snippet: entry.snippet ?? "Web resource",
            url: entry.link,
            domain: parseDomain(entry.link),
          } satisfies WebResource;
        })
        .filter((entry): entry is WebResource => entry !== null) ?? [];

    return uniqueByUrl([...resources, ...fallbackWebResources(topic, query)]).slice(0, 10);
  } catch {
    return fallbackWebResources(topic, query);
  }
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
      const score = relevance * 0.4 + queryMatch * 0.25 + beginnerSuitability * 0.2 + authority * 0.15;
      return { item, score };
    })
    .sort((a, b) => b.score - a.score);

  return ranked.map((entry) => entry.item).slice(0, 5);
}
