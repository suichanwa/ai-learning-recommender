import { NextResponse } from "next/server";
import {
  clearSessionByToken,
  sessionCookieMaxAge,
  sessionCookieName,
} from "@/lib/auth";

export async function POST(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${sessionCookieName()}=`))
    ?.split("=")[1];

  if (token) {
    await clearSessionByToken(token);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: sessionCookieName(),
    value: "",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  response.headers.set("x-session-max-age", String(sessionCookieMaxAge()));
  return response;
}
