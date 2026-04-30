import { z } from "zod";

export const difficulties = ["Beginner", "Intermediate", "Advanced"] as const;
export const goals = [
  "Understand basics",
  "Prepare for exam",
  "Build projects",
  "Career improvement",
] as const;

export const difficultySchema = z.enum(difficulties);
export const goalSchema = z.enum(goals);

const skillsSchema = z
  .array(z.string().trim().min(1).max(80))
  .min(1, "Enter at least one skill")
  .max(10, "Maximum 10 skills");

export const recommendationInputSchema = z
  .object({
    learningPrompt: z.string().trim().min(3).max(1000).optional(),
    skills: z.union([skillsSchema, z.string().trim().min(1).max(1000)]).optional(),
    difficulty: difficultySchema.optional(),
    goal: goalSchema.optional(),
  })
  .refine((value) => Boolean(value.learningPrompt) || Boolean(value.skills), {
    message: "Provide learningPrompt or skills.",
    path: ["learningPrompt"],
  });

export type RecommendationInput = z.infer<typeof recommendationInputSchema>;
