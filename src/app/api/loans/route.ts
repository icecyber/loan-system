import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuth, generateLoanNumber } from "@/lib/auth";
import { calculateLoan } from "@/services/loan-calculation";
import { toCsv, csvResponse } from "@/lib/csv";

const createLoanSchema = z.object({
  customerId: z.string().uuid(),
  loanType: z.enum(["PERSONAL", "HOME", "AUTO", "BUSINESS", "EDUCATION"]).optional(),
  calculationMethod: z
    .enum(["REDUCING_BALANCE", "FLAT_RATE", "EQUAL_PRINCIPAL"])
    .optional(),
  principalAmount: z.string(),
  interestRate: z.string(),
  tenureMonths: z.string(),
  disbursementDate: z.string().optional(),
  firstEmiDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get("status");
  const customerId = searchParams.get("customerId");
  const format = searchParams.get("format") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;

  if (format === "csv") {
    const allLoans = await prisma.loan.findMany({
      where,
      include: {
        customer: {
          include: { user: { select: { fullName: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const headers = ["Loan #", "Customer", "Amount", "Status", "Type", "EMI", "Tenure", "Disbursed", "Created"];
    const rows = allLoans.map((l) => [
      l.loanNumber,
      l.customer?.user?.fullName || "",
      String(l.principalAmount),
      l.status,
      l.loanType,
      String(l.emiAmount),
      String(l.tenureMonths),
      l.disbursementDate ? new Date(l.disbursementDate).toLocaleDateString() : "",
      new Date(l.createdAt).toLocaleDateString(),
    ]);
    return csvResponse(toCsv(headers, rows), "loans.csv");
  }

  const [loans, total] = await Promise.all([
    prisma.loan.findMany({
      where,
      include: {
        customer: {
          include: { user: { select: { id: true, email: true, fullName: true } } },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.loan.count({ where }),
  ]);

  return NextResponse.json({ loans, total, page, limit });
}

export async function POST(req: NextRequest) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createLoanSchema.parse(body);

  const customer = await prisma.customer.findUnique({
    where: { id: parsed.customerId },
  });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const principal = parseFloat(parsed.principalAmount);
  const rate = parseFloat(parsed.interestRate);
  const tenure = parseInt(parsed.tenureMonths);

  const result = calculateLoan(
    parsed.calculationMethod || "REDUCING_BALANCE",
    principal,
    rate,
    tenure,
    parsed.firstEmiDate ? new Date(parsed.firstEmiDate) : undefined,
  );

  const loan = await prisma.loan.create({
    data: {
      loanNumber: generateLoanNumber(),
      customerId: parsed.customerId,
      loanType: parsed.loanType || "PERSONAL",
      calculationMethod: parsed.calculationMethod || "REDUCING_BALANCE",
      principalAmount: principal,
      interestRate: rate,
      tenureMonths: tenure,
      emiAmount: result.emiAmount,
      totalInterest: result.totalInterest,
      totalPayable: result.totalPayable,
      remainingBalance: principal,
      disbursementDate: parsed.disbursementDate
        ? new Date(parsed.disbursementDate)
        : null,
      firstEmiDate: parsed.firstEmiDate
        ? new Date(parsed.firstEmiDate)
        : null,
      status: "PENDING",
      notes: parsed.notes,
      installments: {
        create: result.installments.map((inst) => ({
          installmentNo: inst.installmentNo,
          dueDate: inst.dueDate,
          amount: inst.amount,
          principalPart: inst.principalPart,
          interestPart: inst.interestPart,
          outstandingBefore: inst.outstandingBefore,
          status: "PENDING",
        })),
      },
    },
    include: {
      installments: { orderBy: { installmentNo: "asc" } },
    },
  });

  return NextResponse.json(loan, { status: 201 });
}
