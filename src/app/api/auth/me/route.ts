import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      profile: user.profile,
    },
  });
}
