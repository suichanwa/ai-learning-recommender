import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Plan Not Found</CardTitle>
          <CardDescription>Requested recommendation does not exist or was removed.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/">Generate New Plan</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
