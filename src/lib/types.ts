export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export type LearningGoal =
  | "Understand basics"
  | "Prepare for exam"
  | "Build projects"
  | "Career improvement";

export interface VideoResource {
  title: string;
  videoId: string;
  channelTitle: string;
  thumbnail: string;
  url: string;
}

export interface BookResource {
  title: string;
  author: string;
  year: string;
  url: string;
}

export interface GitHubResource {
  name: string;
  description: string;
  stars: number;
  url: string;
}

export interface WebResource {
  title: string;
  snippet: string;
  url: string;
  domain: string;
}

export interface TopicResourceGroup {
  articles: string[];
  videos: string[];
  practice: string[];
}

export interface TopicPlan {
  topic: string;
  explanation: string;
  keySubtopics: string[];
  orderOfStudy: string[];
  resources: TopicResourceGroup;
  timeline: string;
}

export interface LearningGraphNode {
  id: string;
  label: string;
  type: "topic" | "subtopic";
}

export interface LearningGraphEdge {
  from: string;
  to: string;
  reason: string;
}

export interface LearningGraph {
  nodes: LearningGraphNode[];
  edges: LearningGraphEdge[];
  topologicalOrder: string[];
}

export interface ParsedLearningIntent {
  originalInput: string;
  correctedInput: string;
  detectedTopics: string[];
  expandedTopics: string[];
  inferredDifficulty: Difficulty;
  inferredGoal: LearningGoal;
  knownBackground: string[];
  preferredFormat: string[];
  ambiguityQuestions: string[];
  confidence: number;
  searchQueries: string[];
}

export interface RecommendationOutput {
  overview: string;
  estimatedTimeline: string;
  topicPlans: TopicPlan[];
  learningGraph: LearningGraph;
}
