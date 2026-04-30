import type { GitHubResource } from "@/lib/types";

function buildFallbackRepositories(topicOrQuery: string): GitHubResource[] {
  return [
    {
      name: `${topicOrQuery} learning repositories`,
      description: "Search curated repositories and examples.",
      stars: 0,
      url: `https://github.com/search?q=${encodeURIComponent(topicOrQuery)}&type=repositories`,
    },
    {
      name: `${topicOrQuery} project templates`,
      description: "Starter projects for hands-on practice.",
      stars: 0,
      url: `https://github.com/search?q=${encodeURIComponent(`${topicOrQuery} template`)}&type=repositories`,
    },
  ];
}

export async function fetchGitHubRepositories(query: string): Promise<GitHubResource[]> {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=8`;
  const token = process.env.GITHUB_TOKEN;

  try {
    const response = await fetch(url, {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
            "X-GitHub-Api-Version": "2022-11-28",
          }
        : {
            "X-GitHub-Api-Version": "2022-11-28",
          },
      next: {
        revalidate: 3600,
      },
    });
    if (!response.ok) {
      throw new Error(`GitHub response ${response.status}`);
    }

    const data = (await response.json()) as {
      items?: Array<{
        full_name?: string;
        description?: string;
        stargazers_count?: number;
        html_url?: string;
      }>;
    };

    const repositories =
      data.items
        ?.map((item) => {
          if (!item.full_name || !item.html_url) {
            return null;
          }
          return {
            name: item.full_name,
            description: item.description ?? "No description",
            stars: item.stargazers_count ?? 0,
            url: item.html_url,
          } satisfies GitHubResource;
        })
        .filter((item): item is GitHubResource => item !== null) ?? [];

    return repositories.length > 0 ? repositories : buildFallbackRepositories(query);
  } catch {
    return buildFallbackRepositories(query);
  }
}
