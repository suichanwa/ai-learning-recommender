import type { Difficulty, BookResource, GitHubResource, VideoResource, WebResource } from "./types";
export interface RankedItemsResult<T> {
  items: T[];
  averageScore: number;
}

function tokenize(value: string): string[] {
  return value.toLowerCase().split(/[^a-z0-9+.#]+/).filter(Boolean);
}

function keywordOverlapScore(topic: string, text: string): number {
  const topicTokens = tokenize(topic);
  const textTokens = new Set(tokenize(text));
  if (!topicTokens.length) {
    return 0;
  }
  const matches = topicTokens.filter((token) => textTokens.has(token)).length;
  return matches / topicTokens.length;
}

function beginnerFitScore(text: string, difficulty: Difficulty): number {
  const lower = text.toLowerCase();
  const beginnerHints = /(beginner|basics|introduction|intro|crash course|fundamentals|101)/;
  const advancedHints = /(advanced|deep dive|architecture|expert|internals)/;

  if (difficulty === "Beginner") {
    if (beginnerHints.test(lower)) return 1;
    if (advancedHints.test(lower)) return 0.2;
    return 0.6;
  }
  if (difficulty === "Advanced") {
    if (advancedHints.test(lower)) return 1;
    if (beginnerHints.test(lower)) return 0.3;
    return 0.6;
  }
  return 0.7;
}

function freshnessScore(text: string): number {
  const yearMatches = text.match(/\b(20\d{2})\b/g);
  if (!yearMatches?.length) {
    return 0.5;
  }
  const latestYear = Math.max(...yearMatches.map((year) => Number(year)));
  const age = Math.max(0, new Date().getFullYear() - latestYear);
  if (age <= 1) return 1;
  if (age <= 3) return 0.8;
  if (age <= 6) return 0.6;
  return 0.4;
}

function weightedTotal(scores: {
  relevance: number;
  freshness: number;
  authority: number;
  beginnerFit: number;
}): number {
  return (
    scores.relevance * 0.45 +
    scores.authority * 0.25 +
    scores.beginnerFit * 0.2 +
    scores.freshness * 0.1
  );
}

function summarizeRanked<T>(ranked: Array<{ item: T; score: number }>, minScore: number, take: number): RankedItemsResult<T> {
  const selected = ranked.filter((entry, index) => entry.score >= minScore || index < 2).slice(0, take);
  const averageScore =
    selected.length > 0 ? selected.reduce((sum, entry) => sum + entry.score, 0) / selected.length : 0;
  return {
    items: selected.map((entry) => entry.item),
    averageScore,
  };
}

export function rankVideos(topic: string, difficulty: Difficulty, videos: VideoResource[]): VideoResource[] {
  return rankVideosWithMetrics(topic, difficulty, videos).items;
}

export function rankVideosWithMetrics(
  topic: string,
  difficulty: Difficulty,
  videos: VideoResource[],
): RankedItemsResult<VideoResource> {
  const ranked = videos
    .map((video) => {
      const reference = `${video.title} ${video.channelTitle}`;
      const relevance = keywordOverlapScore(topic, reference);
      const authority = /(official|academy|mozilla|google|microsoft|freecodecamp|coursera|edx)/i.test(
        reference,
      )
        ? 0.9
        : 0.6;
      const beginnerFit = beginnerFitScore(video.title, difficulty);
      const freshness = freshnessScore(video.title);
      return {
        item: video,
        score: weightedTotal({ relevance, freshness, authority, beginnerFit }),
      };
    })
    .sort((a, b) => b.score - a.score);

  return summarizeRanked(ranked, 0.35, 4);
}

export function rankBooks(topic: string, difficulty: Difficulty, books: BookResource[]): BookResource[] {
  return rankBooksWithMetrics(topic, difficulty, books).items;
}

export function rankBooksWithMetrics(
  topic: string,
  difficulty: Difficulty,
  books: BookResource[],
): RankedItemsResult<BookResource> {
  const ranked = books
    .map((book) => {
      const reference = `${book.title} ${book.author}`;
      const relevance = keywordOverlapScore(topic, reference);
      const authority = book.author.toLowerCase() === "unknown author" ? 0.45 : 0.7;
      const beginnerFit = beginnerFitScore(book.title, difficulty);
      const freshness = freshnessScore(`${book.title} ${book.year}`);
      return {
        item: book,
        score: weightedTotal({ relevance, freshness, authority, beginnerFit }),
      };
    })
    .sort((a, b) => b.score - a.score);

  return summarizeRanked(ranked, 0.3, 3);
}

export function rankRepositories(
  topic: string,
  difficulty: Difficulty,
  repositories: GitHubResource[],
): GitHubResource[] {
  return rankRepositoriesWithMetrics(topic, difficulty, repositories).items;
}

export function rankRepositoriesWithMetrics(
  topic: string,
  difficulty: Difficulty,
  repositories: GitHubResource[],
): RankedItemsResult<GitHubResource> {
  const ranked = repositories
    .map((repo) => {
      const reference = `${repo.name} ${repo.description}`;
      const relevance = keywordOverlapScore(topic, reference);
      const authority = Math.min(1, Math.log10(repo.stars + 1) / 4 + 0.35);
      const beginnerFit = beginnerFitScore(reference, difficulty);
      const freshness = 0.6;
      return {
        item: repo,
        score: weightedTotal({ relevance, freshness, authority, beginnerFit }),
      };
    })
    .sort((a, b) => b.score - a.score);

  return summarizeRanked(ranked, 0.3, 4);
}

export function rankWebResourcesWithMetrics(
  topic: string,
  difficulty: Difficulty,
  webResources: WebResource[],
): RankedItemsResult<WebResource> {
  const ranked = webResources
    .map((resource) => {
      const reference = `${resource.title} ${resource.snippet} ${resource.domain}`;
      const relevance = keywordOverlapScore(topic, reference);
      const authority = /(unity\.com|docs\.|developer\.mozilla|react\.dev|nextjs\.org|microsoft\.com|google\.com|w3schools\.com|postgreql\.org|postgresql\.org)/i.test(
        resource.domain,
      )
        ? 0.95
        : 0.65;
      const beginnerFit = beginnerFitScore(reference, difficulty);
      const freshness = freshnessScore(reference);
      return {
        item: resource,
        score: weightedTotal({ relevance, freshness, authority, beginnerFit }),
      };
    })
    .sort((a, b) => b.score - a.score);

  return summarizeRanked(ranked, 0.35, 5);
}
