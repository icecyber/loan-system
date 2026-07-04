import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, fullName: true } },
      loans: {
        include: {
          customer: {
            include: { user: { select: { id: true, email: true, fullName: true } } },
          },
        },
      },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json(customer);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = await req.json();

  if (body.dateOfBirth) body.dateOfBirth = new Date(body.dateOfBirth);
  if (body.monthlyIncome) body.monthlyIncome = parseFloat(body.monthlyIncome);

  try {
    const customer = await prisma.customer.update({
      where: { id },
      data: body,
      include: { user: { select: { id: true, email: true, fullName: true } } },
    });
    return NextResponse.json(customer);
  } catch {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }
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

  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const loans = await prisma.loan.findMany({ where: { customerId: id }, select: { id: true } });
  const loanIds = loans.map((l) => l.id);

  if (loanIds.length > 0) {
    await prisma.installment.deleteMany({ where: { loanId: { in: loanIds } } });
    await prisma.payment.deleteMany({ where: { loanId: { in: loanIds } } });
    await prisma.loan.deleteMany({ where: { id: { in: loanIds } } });
  }

  await prisma.payment.deleteMany({ where: { customerId: id } });
  await prisma.customer.delete({ where: { id } });

  return NextResponse.json({ message: "Customer deleted" });
}
