import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { asStringArray, getCurrentUserFromCookies } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUserFromCookies();
  if (!user) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Login required</CardTitle>
            <CardDescription>Sign in to open your profile.</CardDescription>
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

  const [planCount, latestPlans] = await Promise.all([
    prisma.learningPlan.count({
      where: {
        userId: user.id,
      },
    }),
    prisma.learningPlan.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        skills: true,
        createdAt: true,
      },
    }),
  ]);

  const skillHistory = asStringArray(user.profile?.skillHistory).slice(0, 20);
  const knownBackground = asStringArray(user.profile?.knownBackground).slice(0, 20);
  const goalHistory = asStringArray(user.profile?.goalHistory).slice(0, 20);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="mt-1 text-sm text-muted">Personalized learning memory and history.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/saved" className="rounded-md border bg-card px-3 py-2 text-sm hover:bg-secondary">
            Saved Plans
          </Link>
          <Link href="/" className="rounded-md border bg-card px-3 py-2 text-sm hover:bg-secondary">
            New Plan
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-semibold">Name:</span> {user.name ?? "Not set"}
            </p>
            <p>
              <span className="font-semibold">Email:</span> {user.email}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saved Plans</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-primary">{planCount}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Goals</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {goalHistory.length === 0 ? <p className="text-sm text-muted">No goals yet.</p> : null}
            {goalHistory.map((goal) => (
              <Badge key={goal} variant="secondary">
                {goal}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Skill History</CardTitle>
            <CardDescription>Topics you searched/learned recently.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {skillHistory.length === 0 ? <p className="text-sm text-muted">No skills tracked yet.</p> : null}
            {skillHistory.map((skill) => (
              <Badge key={skill} variant="outline">
                {skill}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Known Background</CardTitle>
            <CardDescription>Background extracted from your prompts.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {knownBackground.length === 0 ? (
              <p className="text-sm text-muted">No background extracted yet.</p>
            ) : null}
            {knownBackground.map((item) => (
              <Badge key={item} variant="outline">
                {item}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest Plans</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {latestPlans.length === 0 ? <p className="text-sm text-muted">No plans yet.</p> : null}
          {latestPlans.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
            >
              <div>
                <p className="text-sm font-medium">{plan.skills.join(", ")}</p>
                <p className="text-xs text-muted">{new Date(plan.createdAt).toLocaleString()}</p>
              </div>
              <Link href={`/results/${plan.id}`} className="text-sm text-primary hover:underline">
                Open
              </Link>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
