import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingResultPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    </main>
  );
}
