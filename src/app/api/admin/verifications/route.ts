import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { getPrivateArtifact } from "@/lib/storage";
import { OrderStatus, Prisma } from "@prisma/client";

export async function GET(request: Request) {
  // 1. Authorize ADMIN role
  const auth = await requireStaff(request, ["ADMIN"]);
  if (auth.response) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") || "WAITING_FOR_VERIFY";
  const search = searchParams.get("search")?.trim();

  try {
    // Determine Prisma filter condition
    let statusFilter: Prisma.OrderWhereInput = {};
    if (filter === "WAITING_FOR_VERIFY") {
      statusFilter = { status: OrderStatus.WAITING_FOR_VERIFY };
    } else if (filter === "PAID") {
      statusFilter = { status: OrderStatus.PAID };
    } else if (filter === "REJECTED") {
      statusFilter = { status: OrderStatus.REJECTED };
    } else {
      // ALL
      statusFilter = {
        status: {
          in: [
            OrderStatus.WAITING_FOR_VERIFY,
            OrderStatus.PAID,
            OrderStatus.REJECTED,
          ],
        },
      };
    }

    let whereClause: Prisma.OrderWhereInput = statusFilter;
    if (search) {
      whereClause = {
        AND: [
          statusFilter,
          {
            OR: [
              { id: { contains: search } },
              { customerName: { contains: search } },
              { customerEmail: { contains: search } },
              { customerPhone: { contains: search } },
              { event: { name: { contains: search } } },
            ],
          },
        ],
      };
    }

    // 2. Query summary counts across all verification statuses
    const [waitingCount, paidCount, rejectedCount] = await Promise.all([
      prisma.order.count({ where: { status: "WAITING_FOR_VERIFY" } }),
      prisma.order.count({ where: { status: "PAID" } }),
      prisma.order.count({ where: { status: "REJECTED" } }),
    ]);

    // 3. Fetch orders based on filter
    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        event: {
          select: {
            id: true,
            name: true,
            category: true,
            eventDate: true,
            startTime: true,
            venue: true,
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            slipUrl: true,
            status: true,
            amount: true,
            rejectReason: true,
            verifiedAt: true,
            createdAt: true,
            verifier: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: filter === "WAITING_FOR_VERIFY" ? "asc" : "desc" },
    });

    // 4. Fetch private slip preview artifacts
    const orderItems = await Promise.all(
      orders.map(async (order) => {
        let slipPreview: string | null = null;
        const latestPayment = order.payments[0];

        if (latestPayment?.slipUrl) {
          try {
            const artifact = await getPrivateArtifact(latestPayment.slipUrl);
            if (artifact) {
              slipPreview = `data:${artifact.contentType};base64,${artifact.data.toString("base64")}`;
            }
          } catch {
            // Keep slipPreview null if artifact unavailable
          }
        }

        return {
          id: order.id,
          customer: {
            name: order.customerName,
            email: order.customerEmail,
            phone: order.customerPhone,
          },
          event: {
            id: order.event.id,
            name: order.event.name,
            category: order.event.category || "Concert",
            eventDate: order.event.eventDate.toISOString(),
            startTime: order.event.startTime,
            venue: order.event.venue,
          },
          quantity: order.quantity,
          totalAmount: order.totalAmount.toFixed(2),
          status: order.status,
          deliveryStatus: order.deliveryStatus,
          slipPreview,
          createdAt: order.createdAt.toISOString(),
          verification: latestPayment
            ? {
                paymentId: latestPayment.id,
                paymentStatus: latestPayment.status,
                verifierName: latestPayment.verifier?.name || null,
                verifierEmail: latestPayment.verifier?.email || null,
                verifiedAt: latestPayment.verifiedAt?.toISOString() || null,
                rejectReason: latestPayment.rejectReason || null,
                amount: latestPayment.amount ? Number(latestPayment.amount).toFixed(2) : null,
              }
            : null,
        };
      }),
    );

    const response = NextResponse.json(
      {
        orders: orderItems,
        counts: {
          waiting: waitingCount,
          paid: paidCount,
          rejected: rejectedCount,
          all: waitingCount + paidCount + rejectedCount,
        },
      },
      { status: 200 },
    );
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "ระบบไม่สามารถดึงข้อมูลรายการตรวจสอบได้ในขณะนี้",
        },
      },
      { status: 503 },
    );
  }
}
