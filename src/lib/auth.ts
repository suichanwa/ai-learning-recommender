import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "ai_lr_session";
const SESSION_DAYS = 30;

type UserWithProfile = {
  id: string;
  email: string;
  name: string | null;
  profile: {
    skillHistory: unknown;
    knownBackground: unknown;
    goalHistory: unknown;
  } | null;
};

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) {
    return false;
  }
  const derived = scryptSync(password, salt, 64).toString("hex");
  const left = Buffer.from(hash, "hex");
  const right = Buffer.from(derived, "hex");
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

function createSessionToken(): string {
  return randomBytes(32).toString("hex");
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSessionForUser(userId: string): Promise<string> {
  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      tokenHash,
      userId,
      expiresAt,
    },
  });

  return token;
}

export async function clearSessionByToken(token: string): Promise<void> {
  const tokenHash = hashSessionToken(token);
  await prisma.session.deleteMany({
    where: { tokenHash },
  });
}

async function userFromToken(token: string): Promise<UserWithProfile | null> {
  const tokenHash = hashSessionToken(token);
  const session = await prisma.session.findFirst({
    where: {
      tokenHash,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: {
        include: {
          profile: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    profile: session.user.profile
      ? {
          skillHistory: session.user.profile.skillHistory,
          knownBackground: session.user.profile.knownBackground,
          goalHistory: session.user.profile.goalHistory,
        }
      : null,
  };
}

export async function getCurrentUserFromRequest(
  request: NextRequest | Request,
): Promise<UserWithProfile | null> {
  const token = request.headers.get("cookie")
    ?.split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${SESSION_COOKIE}=`))
    ?.split("=")[1];
  if (!token) {
    return null;
  }
  return userFromToken(token);
}

export async function getCurrentUserFromCookies(): Promise<UserWithProfile | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  return userFromToken(token);
}

export function sessionCookieName(): string {
  return SESSION_COOKIE;
}

export function sessionCookieMaxAge(): number {
  return SESSION_DAYS * 24 * 60 * 60;
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}
