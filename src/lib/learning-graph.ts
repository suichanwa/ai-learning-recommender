import type { LearningGraph, TopicPlan } from "./types";

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function buildLearningGraph(topicPlans: TopicPlan[]): LearningGraph {
  const nodes: LearningGraph["nodes"] = [];
  const edges: LearningGraph["edges"] = [];
  const topologicalOrder: string[] = [];

  topicPlans.forEach((topicPlan, topicIndex) => {
    const topicId = `topic:${slugify(topicPlan.topic)}`;
    nodes.push({
      id: topicId,
      label: topicPlan.topic,
      type: "topic",
    });
    topologicalOrder.push(topicId);

    if (topicIndex > 0) {
      const previousTopicId = `topic:${slugify(topicPlans[topicIndex - 1].topic)}`;
      edges.push({
        from: previousTopicId,
        to: topicId,
        reason: "Prerequisite progression",
      });
    }

    let previousSubtopicId: string | null = null;
    topicPlan.keySubtopics.forEach((subtopic, subtopicIndex) => {
      const subtopicId = `${topicId}:subtopic:${subtopicIndex + 1}`;
      nodes.push({
        id: subtopicId,
        label: subtopic,
        type: "subtopic",
      });
      topologicalOrder.push(subtopicId);

      edges.push({
        from: topicId,
        to: subtopicId,
        reason: "Topic to subtopic dependency",
      });

      if (previousSubtopicId) {
        edges.push({
          from: previousSubtopicId,
          to: subtopicId,
          reason: "Subtopic sequence",
        });
      }
      previousSubtopicId = subtopicId;
    });
  });

  return {
    nodes,
    edges,
    topologicalOrder,
  };
}
