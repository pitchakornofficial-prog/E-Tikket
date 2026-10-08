import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getSessionSecret,
  SESSION_COOKIE_NAME,
  validateSessionToken,
} from "./lib/session";

export const config = {
  matcher: [
    "/admin/:path*",
    "/organizer/:path*",
    "/api/admin/:path*",
    "/api/organizer/:path*",
    "/login",
  ],
};

function clearCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function middleware(request: NextRequest) {
  // A standalone server's request.url can contain its internal hostname.
  const redirectOrigin = process.env.APP_ORIGIN || request.url;
  const { pathname, search } = request.nextUrl;
  const rawCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  let session = null;
  if (rawCookie) {
    try {
      session = await validateSessionToken(rawCookie, getSessionSecret());
    } catch {
      session = null;
    }
  }

  const isStaffArea =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/organizer") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/organizer");

  const isApiRoute = pathname.startsWith("/api/");

  // 1. Authenticated user accessing /login -> redirect to dashboard
  if (pathname === "/login") {
    if (session) {
      const destination = session.role === "ADMIN" ? "/admin" : "/organizer";
      return NextResponse.redirect(new URL(destination, redirectOrigin));
    }
    // If not authenticated and had invalid cookie, clear it
    if (rawCookie && !session) {
      const response = NextResponse.next();
      clearCookie(response);
      return response;
    }
    return NextResponse.next();
  }

  // 2. Protected staff area without valid session
  if (isStaffArea && !session) {
    if (isApiRoute) {
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (rawCookie) clearCookie(response);
      return response;
    }

    const callbackUrl = encodeURIComponent(`${pathname}${search}`);
    const loginUrl = new URL(`/login?callbackUrl=${callbackUrl}`, redirectOrigin);
    const response = NextResponse.redirect(loginUrl);
    if (rawCookie) clearCookie(response);
    return response;
  }

  // 3. Role-based restrictions: ORGANIZER cannot access admin area
  if (session && session.role === "ORGANIZER") {
    if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
      if (isApiRoute) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/organizer", redirectOrigin));
    }
  }

  return NextResponse.next();
}
