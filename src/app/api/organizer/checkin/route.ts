import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";

function jsonResponse(data: unknown, init?: ResponseInit) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}

export async function POST(request: Request) {
  // 1. Authenticate staff (ORGANIZER only)
  const auth = await requireStaff(request, ["ORGANIZER"]);
  if (auth.response) {
    const res = auth.response;
    res.headers.set("Cache-Control", "private, no-store");
    res.headers.set("Referrer-Policy", "no-referrer");
    return res;
  }

  // 2. Enforce rule: Organizers cannot scan directly; must delegate via Gate Staff links
  return jsonResponse(
    {
      error: {
        code: "ORGANIZER_SCAN_RESTRICTED",
        message: "ผู้จัดงาน (Organizer) ไม่สามารถสแกนบัตรได้โดยตรง กรุณาใช้ลิงก์เฉพาะของเจ้าหน้าที่ตรวจบัตร (Gate Staff) ที่สร้างขึ้นเท่านั้น",
      },
    },
    { status: 403 },
  );
}
