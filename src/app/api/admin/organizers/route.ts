import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await requireStaff(request, ["ADMIN"]);
  if (auth.response) {
    return auth.response;
  }

  try {
    const organizers = await prisma.user.findMany({
      where: { role: "ORGANIZER" },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ organizers }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: { message: "ไม่สามารถดึงรายชื่อผู้จัดงานได้" } },
      { status: 500 },
    );
  }
}
