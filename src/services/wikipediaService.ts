export interface WikipediaTopicSummary {
  topic: string;
  title: string;
  extract: string;
  url: string;
}

export async function fetchWikipediaSummary(
  topic: string,
): Promise<WikipediaTopicSummary> {
  const encoded = encodeURIComponent(topic);
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "ai-learning-recommender/1.0",
      },
      next: {
        revalidate: 3600,
      },
    });

    if (!response.ok) {
      throw new Error(`Wikipedia response ${response.status}`);
    }

    const data = (await response.json()) as {
      title?: string;
      extract?: string;
      content_urls?: { desktop?: { page?: string } };
    };

    return {
      topic,
      title: data.title ?? topic,
      extract:
        data.extract ??
        `Overview unavailable right now. Start with official docs for ${topic}.`,
      url:
        data.content_urls?.desktop?.page ??
        `https://en.wikipedia.org/wiki/${encodeURIComponent(topic.replaceAll(" ", "_"))}`,
    };
  } catch {
    return {
      topic,
      title: topic,
      extract: `Could not load Wikipedia summary for ${topic}. Try official documentation and trusted tutorials.`,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(topic.replaceAll(" ", "_"))}`,
    };
  }
}
