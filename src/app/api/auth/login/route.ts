import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  getSessionSecret,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  verifyPassword,
} from "@/lib/auth";
import { clearFailedLogins, isLoginRateLimited, recordFailedLogin } from "@/lib/login-rate-limit";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isLoginPayload(value: unknown): value is { email: string; password: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.email === "string" && payload.email.length <= 254 && emailPattern.test(payload.email.trim()) &&
    typeof payload.password === "string" && payload.password.length > 0 &&
    Buffer.byteLength(payload.password, "utf8") <= 72
  );
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  if (!isLoginPayload(payload)) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const email = payload.email.trim().toLowerCase();
  if (isLoginRateLimited(email)) {
    return NextResponse.json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 429 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    const passwordIsValid = await verifyPassword(payload.password, user?.passwordHash);
    if (!user || !passwordIsValid || (user.role !== "ADMIN" && user.role !== "ORGANIZER")) {
      recordFailedLogin(email);
      return NextResponse.json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }

    clearFailedLogins(email);
    const token = await createSessionToken({ id: user.id, role: user.role }, getSessionSecret());
    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
      expires: new Date((Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS) * 1000),
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Authentication is temporarily unavailable" }, { status: 500 });
  }
}
