import type { RecommendationInput } from "@/lib/validation";
import type {
  BookResource,
  Difficulty,
  GitHubResource,
  LearningGoal,
  ParsedLearningIntent,
  RecommendationOutput,
  VideoResource,
  WebResource,
} from "@/lib/types";
import {
  rankBooksWithMetrics,
  rankRepositoriesWithMetrics,
  rankVideosWithMetrics,
  rankWebResourcesWithMetrics,
} from "@/lib/resource-ranking";
import { buildLearningGraph } from "@/lib/learning-graph";
import { fetchWikipediaSummary, type WikipediaTopicSummary } from "./wikipediaService";
import { fetchYouTubeVideos } from "./youtubeService";
import { fetchOpenLibraryBooks } from "./openLibraryService";
import { fetchGitHubRepositories } from "./githubService";
import { fetchWebResources, rerankWebResourcesForIntent } from "./webResourceService";
import { generateAIRecommendation } from "./aiService";
import { parseLearningIntent } from "./intentService";

export interface GeneratedRecommendationBundle {
  recommendation: RecommendationOutput;
  wikipediaByTopic: Record<string, WikipediaTopicSummary>;
  videosByTopic: Record<string, VideoResource[]>;
  booksByTopic: Record<string, BookResource[]>;
  reposByTopic: Record<string, GitHubResource[]>;
  webByTopic: Record<string, WebResource[]>;
  parsedIntent: ParsedLearningIntent;
  resolvedDifficulty: Difficulty;
  resolvedGoal: LearningGoal;
  diagnostics: {
    ranking: {
      overallScore: number;
      byTopic: Record<string, number>;
    };
  };
}

export interface PersonalizationContext {
  knownBackground: string[];
  skillHistory: string[];
  goalHistory: string[];
}

interface TopicResourceBundle {
  topic: string;
  rankedVideos: ReturnType<typeof rankVideosWithMetrics>;
  rankedBooks: ReturnType<typeof rankBooksWithMetrics>;
  rankedRepos: ReturnType<typeof rankRepositoriesWithMetrics>;
  rankedWeb: ReturnType<typeof rankWebResourcesWithMetrics>;
}

const curatedResourceList: Record<string, string[]> = {
  javascript: [
    "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
    "https://javascript.info/",
  ],
  react: [
    "https://react.dev/learn",
    "https://nextjs.org/learn/react-foundations",
  ],
  databases: [
    "https://www.postgresql.org/docs/current/tutorial.html",
    "https://www.w3schools.com/sql/",
  ],
  "machine learning": [
    "https://developers.google.com/machine-learning/crash-course",
    "https://scikit-learn.org/stable/user_guide.html",
  ],
  "graphic design": [
    "https://www.interaction-design.org/literature/topics/graphic-design",
    "https://www.canva.com/learn/design/",
  ],
};

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function getCuratedResources(skill: string): string[] {
  return curatedResourceList[skill.trim().toLowerCase()] ?? [];
}

function normalizeTopic(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function topicSearchQuery(topic: string, intent: ParsedLearningIntent, index: number): string {
  return (
    intent.searchQueries[index] ??
    `${topic} ${intent.inferredDifficulty.toLowerCase()} ${intent.inferredGoal.toLowerCase()} tutorial`
  );
}

export async function buildRecommendation(
  input: RecommendationInput,
  personalization?: PersonalizationContext,
): Promise<GeneratedRecommendationBundle> {
  const parsedIntent = await parseLearningIntent(input);
  if (personalization) {
    parsedIntent.knownBackground = unique([
      ...personalization.knownBackground,
      ...parsedIntent.knownBackground,
    ]);
  }
  const resolvedDifficulty = input.difficulty ?? parsedIntent.inferredDifficulty;
  const resolvedGoal = input.goal ?? parsedIntent.inferredGoal;

  const effectiveTopics = unique(
    [
      ...parsedIntent.detectedTopics.map(normalizeTopic),
      ...parsedIntent.expandedTopics.map(normalizeTopic),
    ].slice(0, 8),
  );
  const topics = effectiveTopics.length > 0 ? effectiveTopics : ["Programming Fundamentals"];

  const wikiTopics = parsedIntent.detectedTopics.length > 0 ? parsedIntent.detectedTopics : topics;
  const wikipediaSummaries = await Promise.all(
    wikiTopics.slice(0, 6).map((topic) => fetchWikipediaSummary(topic)),
  );

  const wikipediaByTopic: Record<string, WikipediaTopicSummary> = {};
  wikiTopics.forEach((topic, index) => {
    const summary = wikipediaSummaries[index];
    if (summary) {
      wikipediaByTopic[normalizeTopic(topic)] = summary;
    }
  });

  const videosByTopic: Record<string, VideoResource[]> = {};
  const booksByTopic: Record<string, BookResource[]> = {};
  const reposByTopic: Record<string, GitHubResource[]> = {};
  const webByTopic: Record<string, WebResource[]> = {};
  const videoCatalog: Record<string, string[]> = {};
  const booksCatalog: Record<string, string[]> = {};
  const repoCatalog: Record<string, string[]> = {};
  const webCatalog: Record<string, string[]> = {};
  const curatedResources: Record<string, string[]> = {};
  const rankingByTopic: Record<string, number> = {};

  const topicBundles: TopicResourceBundle[] = await Promise.all(
    topics.map(async (topic, index) => {
      const query = topicSearchQuery(topic, parsedIntent, index);
      const [videosRaw, booksRaw, reposRaw, webRaw] = await Promise.all([
        fetchYouTubeVideos(query),
        fetchOpenLibraryBooks(query),
        fetchGitHubRepositories(query),
        fetchWebResources(topic, query),
      ]);

      const relevanceText = `${parsedIntent.correctedInput} ${topic}`;
      const rankedVideos = rankVideosWithMetrics(relevanceText, resolvedDifficulty, videosRaw);
      const rankedBooks = rankBooksWithMetrics(relevanceText, resolvedDifficulty, booksRaw);
      const rankedRepos = rankRepositoriesWithMetrics(relevanceText, resolvedDifficulty, reposRaw);
      const aiRerankedWeb = rerankWebResourcesForIntent(webRaw, parsedIntent, resolvedDifficulty);
      const rankedWeb = rankWebResourcesWithMetrics(relevanceText, resolvedDifficulty, aiRerankedWeb);

      return {
        topic,
        rankedVideos,
        rankedBooks,
        rankedRepos,
        rankedWeb,
      };
    }),
  );

  topicBundles.forEach(({ topic, rankedVideos, rankedBooks, rankedRepos, rankedWeb }) => {
    videosByTopic[topic] = rankedVideos.items;
    booksByTopic[topic] = rankedBooks.items;
    reposByTopic[topic] = rankedRepos.items;
    webByTopic[topic] = rankedWeb.items;
    videoCatalog[topic] = unique(rankedVideos.items.map((video) => video.url));
    booksCatalog[topic] = unique(rankedBooks.items.map((book) => `${book.title} - ${book.url}`));
    repoCatalog[topic] = unique(rankedRepos.items.map((repo) => `${repo.name} - ${repo.url}`));
    webCatalog[topic] = unique(rankedWeb.items.map((resource) => `${resource.title} - ${resource.url}`));
    curatedResources[topic] = unique(getCuratedResources(topic));
    rankingByTopic[topic] = Math.round(
      ((rankedVideos.averageScore +
        rankedBooks.averageScore +
        rankedRepos.averageScore +
        rankedWeb.averageScore) /
        4) *
        100,
    );
  });

  const recommendation = await generateAIRecommendation({
    correctedInput: parsedIntent.correctedInput,
    topics,
    expandedTopics: parsedIntent.expandedTopics,
    difficulty: resolvedDifficulty,
    goal: resolvedGoal,
    wikipediaSummaries: topics.map(
      (topic) =>
        wikipediaByTopic[topic] ?? {
          topic,
          title: topic,
          extract: `Start from official docs for ${topic}.`,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(topic.replaceAll(" ", "_"))}`,
        },
    ),
    videoCatalog,
    booksCatalog,
    repoCatalog,
    webCatalog,
    curatedResources,
    knownBackground: parsedIntent.knownBackground,
  });

  const recommendationWithGraph: RecommendationOutput = {
    ...recommendation,
    topicPlans: recommendation.topicPlans.map((topicPlan) => ({
      ...topicPlan,
      resources: {
        articles: unique(topicPlan.resources.articles).slice(0, 5),
        videos: unique(topicPlan.resources.videos).slice(0, 4),
        practice: unique(topicPlan.resources.practice).slice(0, 4),
      },
    })),
    learningGraph: recommendation.learningGraph ?? buildLearningGraph(recommendation.topicPlans),
  };

  return {
    recommendation: recommendationWithGraph,
    wikipediaByTopic,
    videosByTopic,
    booksByTopic,
    reposByTopic,
    webByTopic,
    parsedIntent,
    resolvedDifficulty,
    resolvedGoal,
    diagnostics: {
      ranking: {
        overallScore:
          topics.length > 0
            ? Math.round(topics.reduce((sum, topic) => sum + (rankingByTopic[topic] ?? 0), 0) / topics.length)
            : 0,
        byTopic: rankingByTopic,
      },
    },
  };
}
