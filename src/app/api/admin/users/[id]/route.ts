import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const customer = await prisma.customer.findUnique({ where: { userId: id } });
  if (customer) {
    const loans = await prisma.loan.findMany({ where: { customerId: customer.id }, select: { id: true } });
    const loanIds = loans.map((l) => l.id);
    if (loanIds.length > 0) {
      await prisma.installment.deleteMany({ where: { loanId: { in: loanIds } } });
      await prisma.payment.deleteMany({ where: { loanId: { in: loanIds } } });
      await prisma.loan.deleteMany({ where: { id: { in: loanIds } } });
    }
    await prisma.payment.deleteMany({ where: { customerId: customer.id } });
    await prisma.customer.delete({ where: { id: customer.id } });
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ message: "User deleted" });
}
