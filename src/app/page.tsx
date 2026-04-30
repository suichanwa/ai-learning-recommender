import Link from "next/link";
import { BookOpen, Clock3, Library, Sparkles } from "lucide-react";
import { LearningPlanForm } from "@/components/learning-plan-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: BookOpen,
    title: "AI Roadmaps",
    description: "Get order of study, subtopics, and actionable next steps.",
  },
  {
    icon: Library,
    title: "Real Resources",
    description:
      "Combines Wikipedia, YouTube, Open Library books, GitHub repositories, and curated links.",
  },
  {
    icon: Clock3,
    title: "Time Estimates",
    description: "See realistic weekly learning timeline by level and goal.",
  },
];

export default function HomePage() {
  return (
    <main className="bg-grid min-h-screen">
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <Badge variant="secondary" className="text-xs">
            AI Education Planner
          </Badge>
          <Link
            href="/saved"
            className="rounded-md border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary"
          >
            Saved Plans
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Learn smarter with
              <span className="text-primary"> AI-guided content paths</span>
            </h1>
            <p className="max-w-2xl text-base text-muted sm:text-lg">
              Write natural learning request. AI parser extracts intent, fixes noisy wording, infers level/goal,
              then builds personalized roadmap.
            </p>
            <div className="grid gap-3">
              {features.map(({ icon: Icon, title, description }) => (
                <Card key={title} className="border-dashed">
                  <CardContent className="flex items-start gap-3 p-4">
                    <div className="rounded-md bg-secondary p-2">
                      <Icon className="h-4 w-4 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">{title}</p>
                      <p className="text-sm text-muted">{description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="lg:pt-2">
            <LearningPlanForm />
            <p className="mt-4 flex items-center gap-2 text-xs text-muted">
              <Sparkles className="h-3.5 w-3.5" />
              OpenAI key optional. App falls back to mock AI planning when key missing.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
