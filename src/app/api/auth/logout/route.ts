import { NextResponse } from "next/server";
import { getSession, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  const hasCookie =
    request.headers
      .get("cookie")
      ?.split(";")
      .some((cookie) => cookie.trimStart().startsWith(`${SESSION_COOKIE_NAME}=`)) ?? false;

  const session = await getSession(request);
  if (!session) {
    const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (hasCookie) {
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

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
  return response;
}
