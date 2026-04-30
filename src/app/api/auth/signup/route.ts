import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createSessionForUser,
  hashPassword,
  sessionCookieMaxAge,
  sessionCookieName,
} from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(80).optional(),
});

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid signup input" }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(parsed.data.password),
        name: parsed.data.name?.trim() || null,
        profile: {
          create: {
            skillHistory: [],
            knownBackground: [],
            goalHistory: [],
          },
        },
      },
    });

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
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
