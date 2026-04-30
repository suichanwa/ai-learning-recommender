import OpenAI from "openai";
import type { ParsedLearningIntent } from "@/lib/types";
import type { RecommendationInput } from "@/lib/validation";
import { difficulties, goals } from "@/lib/validation";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5-nano";

const aliasMap: Record<string, string> = {
  js: "JavaScript",
  javascript: "JavaScript",
  py: "Python",
  python: "Python",
  db: "Databases",
  sql: "SQL",
  ml: "Machine Learning",
  ai: "Artificial Intelligence",
  backend: "Backend Development",
  frontend: "Frontend Development",
  unity: "Unity",
  unreal: "Unreal Engine",
};

const typoMap: Record<string, string> = {
  lerning: "learning",
  machin: "machine",
  javascirpt: "javascript",
  javascrip: "javascript",
  databse: "database",
  databeses: "databases",
};

const topicExpansions: Record<string, string[]> = {
  JavaScript: ["HTML", "CSS", "DOM manipulation", "Frontend basics"],
  "Machine Learning": ["Python", "Data preprocessing", "Model evaluation", "scikit-learn basics"],
  "Backend Development": ["Node.js", "APIs", "Databases", "Authentication", "Deployment"],
  Databases: ["SQL", "Database design", "Normalization", "Indexing"],
  React: ["Components", "State management", "Hooks", "Routing"],
  "Next.js": ["App Router", "Server Components", "Data fetching", "Deployment"],
  Unity: ["C#", "Game development fundamentals", "Unity editor workflow", "Unity scripting API"],
};

const stopWords = new Set([
  "i",
  "wanna",
  "want",
  "to",
  "learn",
  "for",
  "with",
  "and",
  "the",
  "a",
  "an",
  "me",
  "help",
  "good",
  "at",
  "my",
  "of",
  "in",
  "on",
  "from",
  "using",
  "need",
  "become",
]);

function normalizeSpaces(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function rawInputFromRequest(input: RecommendationInput): string {
  if (input.learningPrompt?.trim()) {
    return normalizeSpaces(input.learningPrompt);
  }
  if (Array.isArray(input.skills)) {
    return normalizeSpaces(input.skills.join(", "));
  }
  if (typeof input.skills === "string") {
    return normalizeSpaces(input.skills);
  }
  return "";
}

function fallbackIntent(input: RecommendationInput): ParsedLearningIntent {
  const originalInput = rawInputFromRequest(input);
  const words = originalInput
    .toLowerCase()
    .split(/[\s,.;:!?]+/)
    .filter(Boolean)
    .map((word) => typoMap[word] ?? word);

  const correctedWords = words.map((word) => aliasMap[word.toLowerCase()] ?? word);
  const correctedInput = normalizeSpaces(
    correctedWords
      .map((word) => (word.length <= 3 ? word : word))
      .join(" "),
  );

  const phraseMatch =
    originalInput.match(/learn\s+([a-z0-9+.#\s]+)/i)?.[1] ??
    originalInput.match(/good at\s+([a-z0-9+.#\s]+)/i)?.[1] ??
    "";
  const phraseTopics = phraseMatch
    .split(/,| and /i)
    .map((part) => normalizeSpaces(part))
    .filter(Boolean)
    .flatMap((candidate) => {
      const normalized = aliasMap[candidate.toLowerCase()] ?? titleCase(candidate);
      return normalized ? [normalized] : [];
    });

  const tokenTopics = correctedWords
    .map((word) => normalizeSpaces(word))
    .filter((word) => word.length > 2 && !stopWords.has(word.toLowerCase()))
    .map((word) => aliasMap[word.toLowerCase()] ?? (/[a-z]/i.test(word) ? titleCase(word) : ""))
    .filter(Boolean);

  const detectedTopics = unique(
    correctedWords
      .map((word) => aliasMap[word.toLowerCase()] ?? "")
      .filter(Boolean)
      .concat(
        phraseTopics,
        tokenTopics,
        /backend/i.test(originalInput) ? ["Backend Development"] : [],
        /frontend|web/i.test(originalInput) ? ["Frontend Development"] : [],
        /react/i.test(originalInput) ? ["React"] : [],
        /next/i.test(originalInput) ? ["Next.js"] : [],
      ),
  )
    .map((topic) => (topic === topic.toUpperCase() ? topic : titleCase(topic)))
    .slice(0, 6);

  const expandedTopics = unique(
    detectedTopics.flatMap((topic) => topicExpansions[topic] ?? []),
  );

  const knownBackground = unique(
    (originalInput.match(/i know ([a-z0-9+.#\s]+)/i)?.[1] ?? "")
      .split(/,| and /i)
      .map((value) => normalizeSpaces(value))
      .filter(Boolean)
      .map((value) => aliasMap[value.toLowerCase()] ?? titleCase(value)),
  );

  const inferredDifficulty =
    input.difficulty ??
    (/beginner|basic|start/i.test(originalInput)
      ? "Beginner"
      : /advanced|expert/i.test(originalInput)
        ? "Advanced"
        : /intermediate/i.test(originalInput)
          ? "Intermediate"
          : "Beginner");

  const inferredGoal =
    input.goal ??
    (/exam|university|test/i.test(originalInput)
      ? "Prepare for exam"
      : /project|build|app|website/i.test(originalInput)
        ? "Build projects"
        : /career|job|interview/i.test(originalInput)
          ? "Career improvement"
          : "Understand basics");

  const preferredFormat = unique(
    [
      /video|youtube|watch/i.test(originalInput) ? "videos" : "",
      /book|read|article|docs/i.test(originalInput) ? "articles" : "",
      /project|practice|build/i.test(originalInput) ? "practice projects" : "",
    ].filter(Boolean),
  );

  const searchQueries = unique(
    [
      ...detectedTopics.map((topic) => `${topic} ${inferredDifficulty.toLowerCase()} tutorial`),
      ...expandedTopics.slice(0, 3).map((topic) => `${topic} beginner guide`),
      `${correctedInput || originalInput} ${inferredGoal.toLowerCase()}`,
    ],
  ).slice(0, 8);

  const ambiguityQuestions: string[] = [];
  if (detectedTopics.length === 0) {
    ambiguityQuestions.push("Which core topic do you want first: frontend, backend, data, or design?");
  }
  if (knownBackground.length === 0) {
    ambiguityQuestions.push("What background do you already have?");
  }

  const confidenceBase = detectedTopics.length > 0 ? 0.7 : 0.45;
  const confidence = Math.max(
    0.35,
    Math.min(
      0.95,
      confidenceBase +
        (expandedTopics.length > 0 ? 0.1 : 0) +
        (knownBackground.length > 0 ? 0.1 : 0) -
        ambiguityQuestions.length * 0.08,
    ),
  );

  return {
    originalInput,
    correctedInput: correctedInput || originalInput,
    detectedTopics: detectedTopics.length > 0 ? detectedTopics : ["Programming Fundamentals"],
    expandedTopics,
    inferredDifficulty,
    inferredGoal,
    knownBackground,
    preferredFormat: preferredFormat.length > 0 ? preferredFormat : ["videos", "articles", "practice projects"],
    ambiguityQuestions,
    confidence: Number(confidence.toFixed(2)),
    searchQueries:
      searchQueries.length > 0
        ? searchQueries
        : ["programming basics beginner tutorial", "software project ideas beginner"],
  };
}

function stripCodeFence(input: string): string {
  return input.replace(/^```json\s*/i, "").replace(/^```/, "").replace(/```$/, "").trim();
}

export async function parseLearningIntent(input: RecommendationInput): Promise<ParsedLearningIntent> {
  const fallback = fallbackIntent(input);
  if (!openai) {
    return fallback;
  }

  const prompt = `Parse learning request into structured JSON.
User input: ${fallback.originalInput}
Optional selected difficulty: ${input.difficulty ?? "not provided"}
Optional selected goal: ${input.goal ?? "not provided"}

Return strict JSON with keys:
{
  "originalInput": string,
  "correctedInput": string,
  "detectedTopics": string[],
  "expandedTopics": string[],
  "inferredDifficulty": ${JSON.stringify(difficulties)},
  "inferredGoal": ${JSON.stringify(goals)},
  "knownBackground": string[],
  "preferredFormat": string[],
  "ambiguityQuestions": string[],
  "confidence": number,
  "searchQueries": string[]
}

Rules:
- Correct typos.
- Resolve aliases (js, py, db).
- Infer intent from natural sentences.
- confidence between 0 and 1.
- no markdown, only JSON.
`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are an intent parser for educational planning. Return strict JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return fallback;
    }

    const parsed = JSON.parse(stripCodeFence(content)) as ParsedLearningIntent;
    if (!parsed.correctedInput || !Array.isArray(parsed.detectedTopics)) {
      return fallback;
    }

    return {
      ...fallback,
      ...parsed,
      inferredDifficulty: difficulties.includes(parsed.inferredDifficulty)
        ? parsed.inferredDifficulty
        : fallback.inferredDifficulty,
      inferredGoal: goals.includes(parsed.inferredGoal)
        ? parsed.inferredGoal
        : fallback.inferredGoal,
      confidence: Number.isFinite(parsed.confidence)
        ? Math.max(0, Math.min(1, parsed.confidence))
        : fallback.confidence,
      detectedTopics: parsed.detectedTopics.length > 0 ? unique(parsed.detectedTopics) : fallback.detectedTopics,
      expandedTopics: unique(parsed.expandedTopics ?? []),
      knownBackground: unique(parsed.knownBackground ?? []),
      preferredFormat: unique(parsed.preferredFormat ?? []),
      ambiguityQuestions: unique(parsed.ambiguityQuestions ?? []),
      searchQueries: unique(parsed.searchQueries ?? []).slice(0, 10),
    };
  } catch {
    return fallback;
  }
}
