"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Login failed");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Access personalized plans and profile history.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </Button>
            <p className="text-center text-sm text-muted">
              No account?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
