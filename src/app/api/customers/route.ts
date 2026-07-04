import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { toCsv, csvResponse } from "@/lib/csv";

const createCustomerSchema = z.object({
  userId: z.string().uuid(),
  phone: z.string().optional(),
  addressLine: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  dateOfBirth: z.string().optional(),
  employmentType: z.string().optional(),
  monthlyIncome: z.string().optional(),
  employerName: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = req.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const format = searchParams.get("format") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const where: any = {};
  if (search) {
    where.OR = [
      { user: { fullName: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
      { phone: { contains: search } },
      { city: { contains: search, mode: "insensitive" } },
    ];
  }

  if (format === "csv") {
    const allCustomers = await prisma.customer.findMany({
      where,
      include: { user: { select: { id: true, email: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
    });
    const headers = ["Name", "Email", "Phone", "City", "State", "Employment Type", "Monthly Income", "Created"];
    const rows = allCustomers.map((c) => [
      c.user?.fullName || "",
      c.user?.email || "",
      c.phone || "",
      c.city || "",
      c.state || "",
      c.employmentType || "",
      c.monthlyIncome ? String(c.monthlyIncome) : "",
      new Date(c.createdAt).toLocaleDateString(),
    ]);
    return csvResponse(toCsv(headers, rows), "customers.csv");
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: { user: { select: { id: true, email: true, fullName: true } } },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.count({ where }),
  ]);

  return NextResponse.json({ customers, total, page, limit });
}

export async function POST(req: NextRequest) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "ADMIN")
    return NextResponse.json({ error: "Only admins can create customers" }, { status: 403 });

  const body = await req.json();
  const parsed = createCustomerSchema.parse(body);

  const existing = await prisma.customer.findUnique({ where: { userId: parsed.userId } });
  if (existing) {
    return NextResponse.json({ error: "Customer profile already exists for this user" }, { status: 409 });
  }

  const customer = await prisma.customer.create({
    data: {
      userId: parsed.userId,
      phone: parsed.phone,
      addressLine: parsed.addressLine,
      city: parsed.city,
      state: parsed.state,
      postalCode: parsed.postalCode,
      dateOfBirth: parsed.dateOfBirth ? new Date(parsed.dateOfBirth) : undefined,
      employmentType: parsed.employmentType,
      monthlyIncome: parsed.monthlyIncome ? parseFloat(parsed.monthlyIncome) : undefined,
      employerName: parsed.employerName,
    },
    include: { user: { select: { id: true, email: true, fullName: true } } },
  });

  return NextResponse.json(customer, { status: 201 });
}
