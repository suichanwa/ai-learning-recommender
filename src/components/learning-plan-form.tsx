"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { recommendationInputSchema } from "@/lib/validation";
import type { Difficulty, LearningGoal } from "@/lib/types";

const difficultyOptions: Array<"Auto" | Difficulty> = ["Auto", "Beginner", "Intermediate", "Advanced"];
const goalOptions: Array<"Auto" | LearningGoal> = [
  "Auto",
  "Understand basics",
  "Prepare for exam",
  "Build projects",
  "Career improvement",
];

export function LearningPlanForm() {
  const router = useRouter();
  const [learningPrompt, setLearningPrompt] = useState("");
  const [difficulty, setDifficulty] = useState<"Auto" | Difficulty>("Auto");
  const [goal, setGoal] = useState<"Auto" | LearningGoal>("Auto");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const payload = {
      learningPrompt: learningPrompt.trim(),
      difficulty: difficulty === "Auto" ? undefined : difficulty,
      goal: goal === "Auto" ? undefined : goal,
    };
    const parsed = recommendationInputSchema.safeParse(payload);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message ?? "Please check your input.";
      setError(firstIssue);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });

      const data = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !data.id) {
        setError(data.error ?? "Could not generate plan. Please try again.");
        return;
      }

      router.push(`/results/${data.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Sparkles className="h-5 w-5 text-primary" />
          Generate AI Learning Plan
        </CardTitle>
        <CardDescription>
          Tell us what you want to learn, your goal, and your current level.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="learningPrompt">What do you want to learn?</Label>
            <Textarea
              id="learningPrompt"
              value={learningPrompt}
              onChange={(event) => setLearningPrompt(event.target.value)}
              placeholder="Example: I know basic Python and want to learn machine learning for projects."
              className="min-h-28"
              disabled={isSubmitting}
            />
            <div className="space-y-1 text-xs text-muted">
              <p>Examples:</p>
              <p>• i wanna learn js for websites</p>
              <p>• machine lerning beginner but i know python</p>
              <p>• help me become good at backend</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Difficulty Override (Optional)</Label>
              <Select
                value={difficulty}
                onValueChange={(value) => setDifficulty(value as "Auto" | Difficulty)}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Auto infer" />
                </SelectTrigger>
                <SelectContent>
                  {difficultyOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Learning Goal Override (Optional)</Label>
              <Select
                value={goal}
                onValueChange={(value) => setGoal(value as "Auto" | LearningGoal)}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Auto infer" />
                </SelectTrigger>
                <SelectContent>
                  {goalOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error ? <p className="text-sm text-red-500">{error}</p> : null}

          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate AI Learning Plan"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
