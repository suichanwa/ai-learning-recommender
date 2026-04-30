import type { BookResource } from "@/lib/types";

function buildFallbackBooks(topicOrQuery: string): BookResource[] {
  return [
    {
      title: `${topicOrQuery} Handbook`,
      author: "Various Authors",
      year: "N/A",
      url: `https://openlibrary.org/search?q=${encodeURIComponent(topicOrQuery)}`,
    },
    {
      title: `${topicOrQuery} Practical Guide`,
      author: "Various Authors",
      year: "N/A",
      url: `https://openlibrary.org/search?q=${encodeURIComponent(`${topicOrQuery} guide`)}`,
    },
  ];
}

export async function fetchOpenLibraryBooks(query: string): Promise<BookResource[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8`;

  try {
    const response = await fetch(url, {
      next: {
        revalidate: 3600,
      },
    });
    if (!response.ok) {
      throw new Error(`Open Library response ${response.status}`);
    }

    const data = (await response.json()) as {
      docs?: Array<{
        title?: string;
        author_name?: string[];
        first_publish_year?: number;
        key?: string;
      }>;
    };

    const books =
      data.docs
        ?.map((item) => {
          if (!item.title) {
            return null;
          }
          return {
            title: item.title,
            author: item.author_name?.[0] ?? "Unknown author",
            year: item.first_publish_year ? String(item.first_publish_year) : "N/A",
            url: item.key ? `https://openlibrary.org${item.key}` : `https://openlibrary.org/search?q=${encodeURIComponent(item.title)}`,
          } satisfies BookResource;
        })
        .filter((item): item is BookResource => item !== null) ?? [];

    return books.length > 0 ? books : buildFallbackBooks(query);
  } catch {
    return buildFallbackBooks(query);
  }
}
