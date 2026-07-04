import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";

const updateStatusSchema = z.object({
  status: z.string(),
  disbursementDate: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = await req.json();
  const parsed = updateStatusSchema.parse(body);

  const loan = await prisma.loan.findUnique({ where: { id } });
  if (!loan) {
    return NextResponse.json({ error: "Loan not found" }, { status: 404 });
  }

  const validTransitions: Record<string, string[]> = {
    PENDING: ["APPROVED", "REJECTED"],
    APPROVED: ["ACTIVE", "REJECTED"],
    ACTIVE: ["CLOSED", "DEFAULTED"],
    DEFAULTED: ["CLOSED"],
  };

  const allowed = validTransitions[loan.status] || [];
  if (!allowed.includes(parsed.status)) {
    return NextResponse.json(
      { error: "Cannot transition from " + loan.status + " to " + parsed.status },
      { status: 400 },
    );
  }

  const updateData: any = { status: parsed.status };
  if (parsed.status === "ACTIVE" && parsed.disbursementDate) {
    updateData.disbursementDate = new Date(parsed.disbursementDate);
  }
  if (parsed.status === "ACTIVE" && !loan.disbursementDate) {
    updateData.disbursementDate = new Date();
  }

  const updated = await prisma.loan.update({
    where: { id },
    data: updateData,
    include: {
      installments: { orderBy: { installmentNo: "asc" } },
    },
  });

  return NextResponse.json(updated);
}
