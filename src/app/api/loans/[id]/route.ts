import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";

const updateLoanSchema = z.object({
  notes: z.string().optional(),
  loanType: z.enum(["PERSONAL", "HOME", "AUTO", "BUSINESS", "EDUCATION"]).optional(),
  disbursementDate: z.string().optional(),
  firstEmiDate: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      customer: {
        include: { user: { select: { id: true, email: true, fullName: true } } },
      },
      installments: { orderBy: { installmentNo: "asc" } },
      payments: { orderBy: { paymentDate: "desc" } },
    },
  });

  if (!loan) {
    return NextResponse.json({ error: "Loan not found" }, { status: 404 });
  }

  return NextResponse.json(loan);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  const existing = await prisma.loan.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Loan not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateLoanSchema.parse(body);

  const data: any = {};
  if (parsed.notes !== undefined) data.notes = parsed.notes;
  if (parsed.loanType !== undefined) data.loanType = parsed.loanType;
  if (parsed.disbursementDate !== undefined) data.disbursementDate = new Date(parsed.disbursementDate);
  if (parsed.firstEmiDate !== undefined) data.firstEmiDate = new Date(parsed.firstEmiDate);

  const loan = await prisma.loan.update({
    where: { id },
    data,
    include: {
      customer: {
        include: { user: { select: { id: true, email: true, fullName: true } } },
      },
      installments: { orderBy: { installmentNo: "asc" } },
      payments: { orderBy: { paymentDate: "desc" } },
    },
  });

  return NextResponse.json(loan);
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;

  const existing = await prisma.loan.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Loan not found" }, { status: 404 });
  }

  await prisma.installment.deleteMany({ where: { loanId: id } });
  await prisma.payment.deleteMany({ where: { loanId: id } });
  await prisma.loan.delete({ where: { id } });

  return NextResponse.json({ message: "Loan deleted" });
}
