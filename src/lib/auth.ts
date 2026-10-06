import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getSession, StaffRole, StaffSession } from "./session";

export * from "./session";

const dummyPasswordHash = "$2b$12$qam7.3UKVvXWLN6Qxhbx9uYx8HS9ZWJzJnnxO.EjBCQjn0u3pMrsq";

export async function verifyPassword(password: string, passwordHash?: string | null): Promise<boolean> {
  return bcrypt.compare(password, passwordHash ?? dummyPasswordHash);
}

export type RequireStaffResult =
  | { session: StaffSession; response?: never }
  | { session?: never; response: NextResponse };

export async function requireStaff(
  request: Request,
  allowedRoles?: StaffRole[],
): Promise<RequireStaffResult> {
  const session = await getSession(request);
  if (!session) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { session };
}
