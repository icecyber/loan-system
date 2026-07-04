import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [
    totalUsers,
    totalCustomers,
    totalLoans,
    activeLoans,
    overdueLoans,
    pendingLoans,
    totalDisbursed,
    totalCollected,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.customer.count(),
    prisma.loan.count(),
    prisma.loan.count({ where: { status: "ACTIVE" } }),
    prisma.loan.count({
      where: { status: { in: ["ACTIVE", "DEFAULTED"] }, delinquentDays: { gt: 0 } },
    }),
    prisma.loan.count({ where: { status: "PENDING" } }),
    prisma.loan.aggregate({
      where: { status: { in: ["ACTIVE", "CLOSED", "DEFAULTED"] } },
      _sum: { principalAmount: true },
    }),
    prisma.payment.aggregate({
      where: { status: "COMPLETED" },
      _sum: { amount: true },
    }),
  ]);

  return NextResponse.json({
    totalUsers,
    totalCustomers,
    totalLoans,
    activeLoans,
    overdueLoans,
    pendingLoans,
    totalDisbursed: Number(totalDisbursed._sum.principalAmount || 0),
    totalCollected: Number(totalCollected._sum.amount || 0),
  });
}
