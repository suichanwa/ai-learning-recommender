import OpenAI from "openai";
import type { Difficulty, LearningGoal, RecommendationOutput } from "@/lib/types";
import { buildLearningGraph } from "@/lib/learning-graph";
import type { WikipediaTopicSummary } from "./wikipediaService";

interface AIContext {
  correctedInput: string;
  topics: string[];
  expandedTopics: string[];
  difficulty: Difficulty;
  goal: LearningGoal;
  knownBackground: string[];
  wikipediaSummaries: WikipediaTopicSummary[];
  videoCatalog: Record<string, string[]>;
  booksCatalog: Record<string, string[]>;
  repoCatalog: Record<string, string[]>;
  webCatalog: Record<string, string[]>;
  curatedResources: Record<string, string[]>;
}

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5-nano";

const FALLBACK_TIMELINE: Record<Difficulty, string> = {
  Beginner: "6-10 weeks",
  Intermediate: "4-8 weeks",
  Advanced: "3-6 weeks",
};

function mockRecommendation(context: AIContext): RecommendationOutput {
  const topicPlans = context.topics.map((topic) => {
    const wiki = context.wikipediaSummaries.find((item) => item.topic === topic);
    return {
      topic,
      explanation:
        wiki?.extract ??
        `${topic} is relevant to your request and should be learned through practical exercises.`,
      keySubtopics: [
        `${topic} fundamentals`,
        `${topic} practical workflows`,
        `${topic} common pitfalls`,
      ],
      orderOfStudy: [
        `Review beginner overview for ${topic}`,
        `Watch one practical tutorial and take notes`,
        `Implement one mini project focused on ${topic}`,
        `Revise weak points and compare with production examples`,
      ],
      resources: {
        articles: [
          wiki?.url ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(topic)}`,
          ...(context.curatedResources[topic] ?? []),
          ...(context.webCatalog[topic]?.slice(0, 2).map((entry) => entry.split(" - ").at(-1) ?? "") ??
            []),
          ...(context.booksCatalog[topic]?.slice(0, 1).map((entry) => entry.split(" - ").at(-1) ?? "") ??
            []),
        ],
        videos: context.videoCatalog[topic] ?? [],
        practice: [
          `Build one project using ${topic} aligned with goal "${context.goal}"`,
          `Study one open-source repository: ${context.repoCatalog[topic]?.[0] ?? "GitHub search results"}`,
          `Prepare concise summary notes for ${topic}`,
        ],
      },
      timeline:
        context.difficulty === "Beginner"
          ? "1-2 weeks"
          : context.difficulty === "Intermediate"
            ? "4-7 days"
            : "3-5 days",
    };
  });

  return {
    overview: `Plan for "${context.correctedInput}". Level: ${context.difficulty}. Goal: ${context.goal}.`,
    estimatedTimeline: FALLBACK_TIMELINE[context.difficulty],
    topicPlans,
    learningGraph: buildLearningGraph(topicPlans),
  };
}

function stripCodeFence(input: string): string {
  return input.replace(/^```json\s*/i, "").replace(/^```/, "").replace(/```$/, "").trim();
}

export async function generateAIRecommendation(
  context: AIContext,
): Promise<RecommendationOutput> {
  if (!openai) {
    return mockRecommendation(context);
  }

  const prompt = `Generate structured learning plan JSON.
Parsed request: ${context.correctedInput}
Difficulty: ${context.difficulty}
Goal: ${context.goal}
Known background: ${JSON.stringify(context.knownBackground)}
Detected topics: ${JSON.stringify(context.topics)}
Expanded topics: ${JSON.stringify(context.expandedTopics)}
Wikipedia summaries: ${JSON.stringify(context.wikipediaSummaries)}
YouTube queries/resources: ${JSON.stringify(context.videoCatalog)}
Open Library resources: ${JSON.stringify(context.booksCatalog)}
GitHub resources: ${JSON.stringify(context.repoCatalog)}
Web docs and sites: ${JSON.stringify(context.webCatalog)}
Curated links: ${JSON.stringify(context.curatedResources)}

Return strict JSON:
{
  "overview": string,
  "estimatedTimeline": string,
  "topicPlans": [
    {
      "topic": string,
      "explanation": string,
      "keySubtopics": string[],
      "orderOfStudy": string[],
      "resources": {
        "articles": string[],
        "videos": string[],
        "practice": string[]
      },
      "timeline": string
    }
  ],
  "learningGraph": {
    "nodes": [{ "id": string, "label": string, "type": "topic" | "subtopic" }],
    "edges": [{ "from": string, "to": string, "reason": string }],
    "topologicalOrder": string[]
  }
}

Constraints:
- topicPlans must cover all detected topics.
- Keep learner-friendly and concise.
- no markdown, only JSON.
`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are an educational planner. Return strict JSON only matching schema.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return mockRecommendation(context);
    }

    const parsed = JSON.parse(stripCodeFence(content)) as RecommendationOutput;
    if (!parsed?.overview || !Array.isArray(parsed?.topicPlans)) {
      return mockRecommendation(context);
    }
    if (!parsed.learningGraph) {
      parsed.learningGraph = buildLearningGraph(parsed.topicPlans);
    }
    return parsed;
  } catch {
    return mockRecommendation(context);
  }
}
