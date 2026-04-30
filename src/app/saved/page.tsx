import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SavedPlansPage() {
  const user = await getCurrentUserFromCookies();
  if (!user) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Login required</CardTitle>
            <CardDescription>Sign in to access personalized saved plans.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login" className="text-sm font-medium text-primary hover:underline">
              Go to login
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  const plans = await prisma.learningPlan.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 30,
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Saved Plans</h1>
        <Link href="/" className="rounded-md border bg-card px-3 py-2 text-sm hover:bg-secondary">
          New Plan
        </Link>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No plans yet</CardTitle>
            <CardDescription>Generate your first learning roadmap from home page.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="line-clamp-2">{plan.skills.join(", ")}</CardTitle>
                <CardDescription>{new Date(plan.createdAt).toLocaleString()}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{plan.difficulty}</Badge>
                  <Badge variant="outline">{plan.goal}</Badge>
                </div>
                <p className="line-clamp-3 text-sm text-muted">{plan.overview}</p>
                <Link href={`/results/${plan.id}`} className="inline-block text-sm font-medium text-primary hover:underline">
                  Open plan
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
