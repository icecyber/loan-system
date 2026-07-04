import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { calculateLoan } from "@/services/loan-calculation";

const calculateSchema = z.object({
  principalAmount: z.string(),
  interestRate: z.string(),
  tenureMonths: z.string(),
  calculationMethod: z
    .enum(["REDUCING_BALANCE", "FLAT_RATE", "EQUAL_PRINCIPAL"])
    .optional(),
  startDate: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = calculateSchema.parse(body);

  const result = calculateLoan(
    parsed.calculationMethod || "REDUCING_BALANCE",
    parseFloat(parsed.principalAmount),
    parseFloat(parsed.interestRate),
    parseInt(parsed.tenureMonths),
    parsed.startDate ? new Date(parsed.startDate) : undefined,
  );

  return NextResponse.json(result);
}
