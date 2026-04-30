"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>API or database might be unavailable. Retry or generate a new plan.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button onClick={reset}>Try Again</Button>
          <Button variant="outline" asChild>
            <Link href="/">Back Home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
