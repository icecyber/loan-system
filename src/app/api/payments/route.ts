import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { toCsv, csvResponse } from "@/lib/csv";

const createPaymentSchema = z.object({
  loanId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  amount: z.string(),
  paymentMode: z
    .enum(["CASH", "BANK_TRANSFER", "CHEQUE", "ONLINE", "UPI"])
    .optional(),
  transactionRef: z.string().optional(),
  paymentDate: z.string().optional(),
  notes: z.string().optional(),
  installmentIds: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = req.nextUrl.searchParams;
  const loanId = searchParams.get("loanId");
  const customerId = searchParams.get("customerId");
  const search = searchParams.get("search") || "";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";
  const format = searchParams.get("format") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const where: any = {};
  if (loanId) where.loanId = loanId;
  if (customerId) where.customerId = customerId;
  if (search) {
    where.OR = [
      { loan: { loanNumber: { contains: search, mode: "insensitive" } } },
      { customer: { user: { fullName: { contains: search, mode: "insensitive" } } } },
      { transactionRef: { contains: search, mode: "insensitive" } },
    ];
  }
  if (dateFrom) where.paymentDate = { ...where.paymentDate, gte: new Date(dateFrom) };
  if (dateTo) where.paymentDate = { ...where.paymentDate, lte: new Date(dateTo + "T23:59:59.999Z") };

  if (format === "csv") {
    const allPayments = await prisma.payment.findMany({
      where,
      include: {
        loan: { select: { loanNumber: true } },
        customer: { include: { user: { select: { fullName: true } } } },
      },
      orderBy: { paymentDate: "desc" },
    });
    const headers = ["Date", "Loan #", "Customer", "Amount", "Mode", "Transaction Ref", "Status"];
    const rows = allPayments.map((p) => [
      new Date(p.paymentDate).toLocaleDateString(),
      p.loan?.loanNumber || "",
      p.customer?.user?.fullName || "",
      String(p.amount),
      p.paymentMode,
      p.transactionRef || "",
      p.status,
    ]);
    return csvResponse(toCsv(headers, rows), "payments.csv");
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        loan: { select: { loanNumber: true } },
        customer: {
          include: { user: { select: { fullName: true } } },
        },
      },
      skip,
      take: limit,
      orderBy: { paymentDate: "desc" },
    }),
    prisma.payment.count({ where }),
  ]);

  return NextResponse.json({ payments, total, page, limit });
}

export async function POST(req: NextRequest) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createPaymentSchema.parse(body);

  const loan = await prisma.loan.findUnique({
    where: { id: parsed.loanId },
  });
  if (!loan) {
    return NextResponse.json({ error: "Loan not found" }, { status: 404 });
  }
  if (loan.status !== "ACTIVE") {
    return NextResponse.json({ error: "Loan is not active" }, { status: 400 });
  }

  const customerId = parsed.customerId || loan.customerId;

  const payment = await prisma.payment.create({
    data: {
      loanId: parsed.loanId,
      customerId,
      amount: parseFloat(parsed.amount),
      paymentMode: parsed.paymentMode || "CASH",
      transactionRef: parsed.transactionRef,
      paymentDate: parsed.paymentDate
        ? new Date(parsed.paymentDate)
        : new Date(),
      status: "COMPLETED",
      notes: parsed.notes,
    },
  });

  if (parsed.installmentIds && parsed.installmentIds.length > 0) {
    await prisma.installment.updateMany({
      where: { id: { in: parsed.installmentIds } },
      data: {
        status: "PAID",
        paidDate: new Date(),
        paymentId: payment.id,
      },
    });
  }

  const totalPaid = await prisma.installment.aggregate({
    where: { loanId: parsed.loanId, status: "PAID" },
    _sum: { principalPart: true },
  });

  const remainingBalance =
    parseFloat(loan.principalAmount.toString()) -
    parseFloat(totalPaid._sum.principalPart?.toString() || "0");

  await prisma.loan.update({
    where: { id: parsed.loanId },
    data: { remainingBalance: Math.max(0, remainingBalance) },
  });

  const paymentWithRelations = await prisma.payment.findUnique({
    where: { id: payment.id },
    include: {
      installments: { select: { id: true, installmentNo: true } },
    },
  });

  return NextResponse.json(paymentWithRelations, { status: 201 });
}
