import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createSessionForUser,
  sessionCookieMaxAge,
  sessionCookieName,
  verifyPassword,
} from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid login input" }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await createSessionForUser(user.id);
    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    });
    response.cookies.set({
      name: sessionCookieName(),
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: sessionCookieMaxAge(),
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
