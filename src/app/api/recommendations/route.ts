import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { recommendationInputSchema } from "@/lib/validation";
import { buildRecommendation } from "@/services/recommendationService";
import { prisma } from "@/lib/prisma";
import { asStringArray, getCurrentUserFromRequest } from "@/lib/auth";

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const parsed = recommendationInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const user = await getCurrentUserFromRequest(request);
    const personalization = user?.profile
      ? {
          skillHistory: asStringArray(user.profile.skillHistory),
          knownBackground: asStringArray(user.profile.knownBackground),
          goalHistory: asStringArray(user.profile.goalHistory),
        }
      : undefined;

    const bundle = await buildRecommendation(parsed.data, personalization);
    const skills = bundle.recommendation.topicPlans.map((topicPlan) => topicPlan.topic);

    const resources = skills.reduce<Record<string, unknown>>((acc, skill, index) => {
      const topicPlan = bundle.recommendation.topicPlans[index];
      acc[skill] = {
        wikipedia: bundle.wikipediaByTopic[skill],
        youtube: bundle.videosByTopic[skill],
        books: bundle.booksByTopic[skill],
        repositories: bundle.reposByTopic[skill],
        web: bundle.webByTopic[skill],
        grouped: topicPlan?.resources ?? {
          articles: [],
          videos: [],
          practice: [],
        },
      };
      return acc;
    }, {});
    const roadmapJson = JSON.parse(
      JSON.stringify({
        estimatedTimeline: bundle.recommendation.estimatedTimeline,
        topics: bundle.recommendation.topicPlans,
        learningGraph: bundle.recommendation.learningGraph,
        originalInput: bundle.parsedIntent.originalInput,
        correctedInput: bundle.parsedIntent.correctedInput,
        parsedIntent: bundle.parsedIntent,
        diagnostics: bundle.diagnostics,
      }),
    ) as Prisma.InputJsonValue;
    const resourcesJson = JSON.parse(JSON.stringify(resources)) as Prisma.InputJsonValue;

    const savedPlan = await prisma.learningPlan.create({
      data: {
        skills,
        difficulty: bundle.resolvedDifficulty,
        goal: bundle.resolvedGoal,
        overview: bundle.recommendation.overview,
        roadmap: roadmapJson,
        resources: resourcesJson,
        userId: user?.id ?? null,
      },
    });

    if (user) {
      const mergedSkills = unique([...(personalization?.skillHistory ?? []), ...skills]).slice(0, 80);
      const mergedBackground = unique([
        ...(personalization?.knownBackground ?? []),
        ...bundle.parsedIntent.knownBackground,
      ]).slice(0, 80);
      const mergedGoals = unique([
        ...(personalization?.goalHistory ?? []),
        bundle.resolvedGoal,
      ]).slice(0, 30);

      await prisma.userProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          skillHistory: mergedSkills,
          knownBackground: mergedBackground,
          goalHistory: mergedGoals,
        },
        update: {
          skillHistory: mergedSkills,
          knownBackground: mergedBackground,
          goalHistory: mergedGoals,
        },
      });
    }

    return NextResponse.json({
      id: savedPlan.id,
      recommendation: bundle.recommendation,
      createdAt: savedPlan.createdAt,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate recommendation. Check external API keys and database config.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
