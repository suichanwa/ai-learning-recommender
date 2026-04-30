import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { getCurrentUserFromCookies } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Learning Recommender",
  description: "Generate personalized learning plans with AI, Wikipedia, and YouTube",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUserFromCookies();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <p className="text-sm font-semibold text-muted">AI Learning Recommender</p>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="rounded-md border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary"
              >
                Home
              </Link>
              {user ? (
                <>
                  <Link
                    href="/profile"
                    className="rounded-md border bg-card px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    {user.name ?? user.email}
                  </Link>
                  <Link
                    href="/logout"
                    className="rounded-md border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary"
                  >
                    Logout
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-md border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-md border bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
