import type { JsonValue } from "@prisma/client/runtime/library";
import type {
  BookResource,
  GitHubResource,
  LearningGraph,
  ParsedLearningIntent,
  TopicPlan,
  VideoResource,
  WebResource,
} from "./types";

export interface StoredTopicResources {
  wikipedia?: {
    topic?: string;
    title?: string;
    extract?: string;
    url?: string;
  };
  youtube?: VideoResource[];
  books?: BookResource[];
  repositories?: GitHubResource[];
  web?: WebResource[];
  grouped?: {
    articles?: string[];
    videos?: string[];
    practice?: string[];
  };
}

export interface ParsedRoadmap {
  estimatedTimeline: string;
  topicPlans: TopicPlan[];
  learningGraph: LearningGraph;
  originalInput: string;
  correctedInput: string;
  parsedIntent: ParsedLearningIntent | null;
  diagnostics: {
    ranking: {
      overallScore: number;
      byTopic: Record<string, number>;
    };
  };
}

function parseTopicPlanList(value: unknown): TopicPlan[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const obj = item as Record<string, unknown>;
      return {
        topic: String(obj.topic ?? "Topic"),
        explanation: String(obj.explanation ?? ""),
        keySubtopics: Array.isArray(obj.keySubtopics) ? obj.keySubtopics.map(String) : [],
        orderOfStudy: Array.isArray(obj.orderOfStudy) ? obj.orderOfStudy.map(String) : [],
        resources: {
          articles: Array.isArray((obj.resources as Record<string, unknown> | undefined)?.articles)
            ? ((obj.resources as Record<string, unknown>).articles as unknown[]).map(String)
            : [],
          videos: Array.isArray((obj.resources as Record<string, unknown> | undefined)?.videos)
            ? ((obj.resources as Record<string, unknown>).videos as unknown[]).map(String)
            : [],
          practice: Array.isArray((obj.resources as Record<string, unknown> | undefined)?.practice)
            ? ((obj.resources as Record<string, unknown>).practice as unknown[]).map(String)
            : [],
        },
        timeline: String(obj.timeline ?? ""),
      } satisfies TopicPlan;
    })
    .filter((item): item is TopicPlan => item !== null);
}

function parseLearningGraph(value: unknown, fallbackTopics: TopicPlan[]): LearningGraph {
  if (!value || typeof value !== "object") {
    return {
      nodes: [],
      edges: [],
      topologicalOrder: fallbackTopics.map((topicPlan) => topicPlan.topic),
    };
  }

  const graph = value as Record<string, unknown>;
  return {
    nodes: Array.isArray(graph.nodes)
      ? graph.nodes
          .map((node) => {
            if (!node || typeof node !== "object") {
              return null;
            }
            const valueNode = node as Record<string, unknown>;
            return {
              id: String(valueNode.id ?? ""),
              label: String(valueNode.label ?? ""),
              type: valueNode.type === "subtopic" ? "subtopic" : "topic",
            };
          })
          .filter((node): node is LearningGraph["nodes"][number] => node !== null)
      : [],
    edges: Array.isArray(graph.edges)
      ? graph.edges
          .map((edge) => {
            if (!edge || typeof edge !== "object") {
              return null;
            }
            const valueEdge = edge as Record<string, unknown>;
            return {
              from: String(valueEdge.from ?? ""),
              to: String(valueEdge.to ?? ""),
              reason: String(valueEdge.reason ?? ""),
            };
          })
          .filter((edge): edge is LearningGraph["edges"][number] => edge !== null)
      : [],
    topologicalOrder: Array.isArray(graph.topologicalOrder)
      ? graph.topologicalOrder.map(String)
      : fallbackTopics.map((topicPlan) => topicPlan.topic),
  };
}

function parseIntent(value: unknown): ParsedLearningIntent | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const intent = value as Record<string, unknown>;
  return {
    originalInput: String(intent.originalInput ?? ""),
    correctedInput: String(intent.correctedInput ?? ""),
    detectedTopics: Array.isArray(intent.detectedTopics) ? intent.detectedTopics.map(String) : [],
    expandedTopics: Array.isArray(intent.expandedTopics) ? intent.expandedTopics.map(String) : [],
    inferredDifficulty:
      intent.inferredDifficulty === "Intermediate" || intent.inferredDifficulty === "Advanced"
        ? intent.inferredDifficulty
        : "Beginner",
    inferredGoal:
      intent.inferredGoal === "Prepare for exam" ||
      intent.inferredGoal === "Build projects" ||
      intent.inferredGoal === "Career improvement"
        ? intent.inferredGoal
        : "Understand basics",
    knownBackground: Array.isArray(intent.knownBackground) ? intent.knownBackground.map(String) : [],
    preferredFormat: Array.isArray(intent.preferredFormat) ? intent.preferredFormat.map(String) : [],
    ambiguityQuestions: Array.isArray(intent.ambiguityQuestions)
      ? intent.ambiguityQuestions.map(String)
      : [],
    confidence: Number.isFinite(Number(intent.confidence)) ? Number(intent.confidence) : 0,
    searchQueries: Array.isArray(intent.searchQueries) ? intent.searchQueries.map(String) : [],
  };
}

export function parseRoadmap(value: JsonValue): ParsedRoadmap {
  if (Array.isArray(value)) {
    const topicPlans = parseTopicPlanList(value);
    return {
      estimatedTimeline: "Timeline not specified",
      topicPlans,
      learningGraph: parseLearningGraph(null, topicPlans),
      originalInput: "",
      correctedInput: "",
      parsedIntent: null,
      diagnostics: {
        ranking: {
          overallScore: 0,
          byTopic: {},
        },
      },
    };
  }

  if (!value || typeof value !== "object") {
    return {
      estimatedTimeline: "Timeline not specified",
      topicPlans: [],
      learningGraph: {
        nodes: [],
        edges: [],
        topologicalOrder: [],
      },
      originalInput: "",
      correctedInput: "",
      parsedIntent: null,
      diagnostics: {
        ranking: {
          overallScore: 0,
          byTopic: {},
        },
      },
    };
  }

  const roadmap = value as Record<string, unknown>;
  const topicPlans = parseTopicPlanList(roadmap.topics);
  const diagnosticsRaw =
    roadmap.diagnostics && typeof roadmap.diagnostics === "object"
      ? (roadmap.diagnostics as Record<string, unknown>)
      : null;
  const rankingRaw =
    diagnosticsRaw?.ranking && typeof diagnosticsRaw.ranking === "object"
      ? (diagnosticsRaw.ranking as Record<string, unknown>)
      : null;
  const rankingByTopic: Record<string, number> = {};
  if (rankingRaw?.byTopic && typeof rankingRaw.byTopic === "object") {
    Object.entries(rankingRaw.byTopic as Record<string, unknown>).forEach(([key, valueEntry]) => {
      const numeric = Number(valueEntry);
      rankingByTopic[key] = Number.isFinite(numeric) ? numeric : 0;
    });
  }

  return {
    estimatedTimeline: String(roadmap.estimatedTimeline ?? "Timeline not specified"),
    topicPlans,
    learningGraph: parseLearningGraph(roadmap.learningGraph, topicPlans),
    originalInput: String(roadmap.originalInput ?? ""),
    correctedInput: String(roadmap.correctedInput ?? ""),
    parsedIntent: parseIntent(roadmap.parsedIntent),
    diagnostics: {
      ranking: {
        overallScore: Number.isFinite(Number(rankingRaw?.overallScore))
          ? Number(rankingRaw?.overallScore)
          : 0,
        byTopic: rankingByTopic,
      },
    },
  };
}

export function parseResourcesMap(value: JsonValue): Record<string, StoredTopicResources> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, StoredTopicResources>;
}
