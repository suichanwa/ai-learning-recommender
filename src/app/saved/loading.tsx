import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SavedLoadingPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-1/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
