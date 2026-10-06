import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getSession,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  createSessionToken,
  getSessionSecret,
} from "@/lib/auth";

function unauthorized(clearCookie: boolean) {
  const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (clearCookie) {
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
  }
  return response;
}

export async function GET(request: Request) {
  const hasCookie = request.headers.get("cookie")?.split(";").some((cookie) =>
    cookie.trimStart().startsWith(`${SESSION_COOKIE_NAME}=`),
  ) ?? false;

  try {
    const session = await getSession(request);
    if (!session) return unauthorized(hasCookie);

    const user = await prisma.user.findUnique({ where: { id: session.sub } });
    if (!user || user.role !== session.role) return unauthorized(true);

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
