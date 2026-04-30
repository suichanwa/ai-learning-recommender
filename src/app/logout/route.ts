import { NextResponse } from "next/server";
import {
  clearSessionByToken,
  sessionCookieName,
} from "@/lib/auth";

export async function GET(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${sessionCookieName()}=`))
    ?.split("=")[1];

  if (token) {
    await clearSessionByToken(token);
  }

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set({
    name: sessionCookieName(),
    value: "",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}
