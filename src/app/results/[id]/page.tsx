import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookOpen,
  ExternalLink,
  FolderGit2,
  GitBranch,
  Globe,
  Lightbulb,
  ListChecks,
  MessageSquareWarning,
  PlayCircle,
  Sparkles,
  Star,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { parseResourcesMap, parseRoadmap } from "@/lib/plan";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUserFromCookies();
  const plan = await prisma.learningPlan.findUnique({
    where: { id },
  });

  if (!plan) {
    notFound();
  }
  if (plan.userId && (!user || plan.userId !== user.id)) {
    notFound();
  }

  const roadmap = parseRoadmap(plan.roadmap);
  const topicPlans = roadmap.topicPlans;
  const resourcesMap = parseResourcesMap(plan.resources);
  const nodeLabelMap = new Map(roadmap.learningGraph.nodes.map((node) => [node.id, node.label]));

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Learning Plan</h1>
          <p className="mt-1 text-sm text-muted">Generated on {new Date(plan.createdAt).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{plan.difficulty}</Badge>
          <Badge variant="outline">{plan.goal}</Badge>
          <Badge variant="secondary">
            Ranking {roadmap.diagnostics.ranking.overallScore > 0 ? `${roadmap.diagnostics.ranking.overallScore}%` : "N/A"}
          </Badge>
          <Badge variant="outline">
            DAG {roadmap.learningGraph.nodes.length}N / {roadmap.learningGraph.edges.length}E
          </Badge>
          <Link href="/saved" className="rounded-md border bg-card px-3 py-2 text-sm hover:bg-secondary">
            Saved Plans
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Understood Learning Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="font-semibold">Original:</span>{" "}
            <span className="text-muted">{roadmap.originalInput || "Not available"}</span>
          </p>
          <p>
            <span className="font-semibold">Understood as:</span>{" "}
            <span className="text-primary">{roadmap.correctedInput || "Not available"}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {(roadmap.parsedIntent?.detectedTopics ?? []).map((topic) => (
              <Badge key={topic} variant="secondary">
                {topic}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              Inferred level: {roadmap.parsedIntent?.inferredDifficulty ?? plan.difficulty}
            </Badge>
            <Badge variant="outline">
              Inferred goal: {roadmap.parsedIntent?.inferredGoal ?? plan.goal}
            </Badge>
            <Badge variant="secondary">
              Confidence:{" "}
              {roadmap.parsedIntent ? `${Math.round(roadmap.parsedIntent.confidence * 100)}%` : "N/A"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {roadmap.parsedIntent &&
      (roadmap.parsedIntent.confidence < 0.65 || roadmap.parsedIntent.ambiguityQuestions.length > 0) ? (
        <Card className="border-amber-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-300">
              <MessageSquareWarning className="h-5 w-5" />
              Clarification Suggestions
            </CardTitle>
            <CardDescription>
              Plan generated, but parser detected ambiguity. Refine prompt for sharper recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted">
            {roadmap.parsedIntent.ambiguityQuestions.map((question) => (
              <p key={question}>• {question}</p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Topic Overview</CardTitle>
          <CardDescription>{plan.skills.join(", ")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-7 text-muted">{plan.overview}</p>
          <p className="mt-3 text-sm font-medium text-foreground">
            Estimated timeline: <span className="text-primary">{roadmap.estimatedTimeline}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Learning Graph (DAG)
          </CardTitle>
          <CardDescription>Prerequisite flow and recommended topological sequence.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-semibold">Topological Order</p>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
              {roadmap.learningGraph.topologicalOrder.map((nodeId, index) => (
                <span key={`${nodeId}-${index}`} className="rounded-md border bg-secondary px-2 py-1">
                  {nodeLabelMap.get(nodeId) ?? nodeId}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Dependencies</p>
            <div className="space-y-2 text-sm text-muted">
              {roadmap.learningGraph.edges.slice(0, 20).map((edge, index) => (
                <p key={`${edge.from}-${edge.to}-${index}`}>
                  {nodeLabelMap.get(edge.from) ?? edge.from} → {nodeLabelMap.get(edge.to) ?? edge.to}
                  {" · "}
                  {edge.reason}
                </p>
              ))}
              {roadmap.learningGraph.edges.length === 0 ? <p>No dependency edges available.</p> : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue={topicPlans[0]?.topic ?? "overview"}>
        <TabsList className="h-auto flex-wrap">
          {topicPlans.map((topicPlan) => (
            <TabsTrigger key={topicPlan.topic} value={topicPlan.topic}>
              {topicPlan.topic}
            </TabsTrigger>
          ))}
        </TabsList>

        {topicPlans.map((topicPlan) => {
          const topicResource = resourcesMap[topicPlan.topic];
          const wiki = topicResource?.wikipedia;
          const videos = topicResource?.youtube ?? [];
          const books = topicResource?.books ?? [];
          const repositories = topicResource?.repositories ?? [];
          const webResources = topicResource?.web ?? [];

          return (
            <TabsContent key={topicPlan.topic} value={topicPlan.topic} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    {topicPlan.topic}
                  </CardTitle>
                  <CardDescription>{topicPlan.timeline}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-7 text-muted">{topicPlan.explanation}</p>
                  <div>
                    <p className="mb-2 text-sm font-semibold">Key Subtopics</p>
                    <div className="flex flex-wrap gap-2">
                      {topicPlan.keySubtopics.map((subtopic) => (
                        <Badge key={subtopic} variant="secondary">
                          {subtopic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ListChecks className="h-5 w-5 text-primary" />
                      Recommended Order
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="list-decimal space-y-2 pl-5 text-sm text-muted">
                      {topicPlan.orderOfStudy.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Wikipedia Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted">
                    <p>{wiki?.extract ?? "No summary available."}</p>
                    {wiki?.url ? (
                      <a
                        href={wiki.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        Open Wikipedia <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      Book Suggestions (Open Library)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {books.map((book) => (
                      <a
                        key={`${book.url}-${book.title}`}
                        href={book.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-md border p-3 transition hover:bg-secondary"
                      >
                        <p className="text-sm font-medium">{book.title}</p>
                        <p className="text-xs text-muted">
                          {book.author} • {book.year}
                        </p>
                      </a>
                    ))}
                    {books.length === 0 ? <p className="text-sm text-muted">No book suggestions available.</p> : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FolderGit2 className="h-5 w-5 text-primary" />
                      Open-source Repositories
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {repositories.map((repo) => (
                      <a
                        key={`${repo.url}-${repo.name}`}
                        href={repo.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-md border p-3 transition hover:bg-secondary"
                      >
                        <p className="text-sm font-medium">{repo.name}</p>
                        <p className="line-clamp-2 text-xs text-muted">{repo.description}</p>
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-foreground">
                          <Star className="h-3.5 w-3.5" />
                          {repo.stars.toLocaleString()} stars
                        </p>
                      </a>
                    ))}
                    {repositories.length === 0 ? (
                      <p className="text-sm text-muted">No repository suggestions available.</p>
                    ) : null}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PlayCircle className="h-5 w-5 text-primary" />
                    YouTube Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {videos.map((video) => (
                    <a
                      key={`${video.url}-${video.title}`}
                      href={video.url}
                      target="_blank"
                      rel="noreferrer"
                      className="overflow-hidden rounded-lg border bg-card transition hover:shadow-md"
                    >
                      {video.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={video.thumbnail} alt={video.title} className="h-40 w-full object-cover" />
                      ) : null}
                      <div className="space-y-1 p-3">
                        <p className="line-clamp-2 text-sm font-medium">{video.title}</p>
                        <p className="text-xs text-muted">{video.channelTitle}</p>
                      </div>
                    </a>
                  ))}
                  {videos.length === 0 ? <p className="text-sm text-muted">No video recommendations available.</p> : null}
                </CardContent>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-primary" />
                      Docs & Learning Sites
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {webResources.map((resource) => (
                      <a
                        key={`${resource.url}-${resource.title}`}
                        href={resource.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-md border p-3 transition hover:bg-secondary"
                      >
                        <p className="text-sm font-medium">{resource.title}</p>
                        <p className="line-clamp-2 text-xs text-muted">{resource.snippet}</p>
                        <p className="mt-1 text-xs text-muted">
                          {resource.domain}
                          {resource.provider ? ` • ${resource.provider}` : ""}
                        </p>
                        {resource.whyPicked && resource.whyPicked.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {resource.whyPicked.map((reason) => (
                              <span key={`${resource.url}-${reason}`} className="rounded-sm border px-1.5 py-0.5 text-[10px] text-muted">
                                {reason}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </a>
                    ))}
                    {webResources.length === 0 ? <p className="text-sm text-muted">No web resources available.</p> : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Articles</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {topicPlan.resources.articles.map((link) => (
                      <a
                        key={link}
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-primary hover:underline"
                      >
                        {link}
                      </a>
                    ))}
                    {topicPlan.resources.articles.length === 0 ? (
                      <p className="text-muted">No article links generated.</p>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Practice / Project Ideas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted">
                    {topicPlan.resources.practice.map((item) => (
                      <p key={item}>• {item}</p>
                    ))}
                    {topicPlan.resources.practice.length === 0 ? <p>No practice ideas generated.</p> : null}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </main>
  );
}
