import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = req.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const withoutCustomer = searchParams.get("withoutCustomer") === "true";

  const where: any = {};
  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { fullName: { contains: search, mode: "insensitive" } },
    ];
  }
  if (withoutCustomer) {
    where.customer = null;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, email: true, fullName: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ users, total });
}
