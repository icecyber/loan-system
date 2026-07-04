import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { jsPDF } from "jspdf";

function fmt(n: number): string {
  return "$" + n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

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
      customer: { include: { user: true } },
      installments: { orderBy: { installmentNo: "asc" } },
    },
  });

  if (!loan) {
    return NextResponse.json({ error: "Loan not found" }, { status: 404 });
  }

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const tableTop = 220;
  const colWidths = [30, 75, 70, 70, 70, 85, 55];
  const colPositions: number[] = [];
  let currentX = margin;
  for (const w of colWidths) {
    colPositions.push(currentX);
    currentX += w;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Loan Amortization Schedule", pageWidth / 2, 50, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const leftX = margin;
  const labelX = 150;
  let y = 80;

  const addField = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, leftX, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, leftX + labelX, y);
    y += 16;
  };

  addField("Loan Number:", loan.loanNumber);
  addField("Customer:", loan.customer.user.fullName);
  addField("Principal:", fmt(Number(loan.principalAmount)));
  addField("Interest Rate:", Number(loan.interestRate) + "% p.a.");
  addField("Tenure:", loan.tenureMonths + " months");
  addField("Method:", loan.calculationMethod.replace(/_/g, " "));
  addField("EMI Amount:", fmt(Number(loan.emiAmount)));
  addField("Total Interest:", fmt(Number(loan.totalInterest)));
  addField("Total Payable:", fmt(Number(loan.totalPayable)));

  y = tableTop;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);

  doc.setFillColor(37, 99, 235);
  doc.rect(margin, y - 4, pageWidth - 2 * margin, 18, "F");
  doc.setTextColor(255, 255, 255);

  const headers = ["#", "Due Date", "Amount", "Principal", "Interest", "Outstanding", "Status"];
  headers.forEach((h, i) => {
    const align = i === 0 ? "center" as const : "right" as const;
    doc.text(h, colPositions[i] + colWidths[i] / 2, y + 5, { align });
  });

  y += 18;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  let rowCount = 0;
  for (const inst of loan.installments) {
    if (y > 750) {
      doc.addPage();
      y = margin + 20;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setFillColor(37, 99, 235);
      doc.rect(margin, y - 4, pageWidth - 2 * margin, 18, "F");
      doc.setTextColor(255, 255, 255);
      headers.forEach((h, i) => {
        const align = i === 0 ? "center" as const : "right" as const;
        doc.text(h, colPositions[i] + colWidths[i] / 2, y + 5, { align });
      });
      y += 18;
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
    }

    if (rowCount % 2 === 1) {
      doc.setFillColor(243, 244, 246);
      doc.rect(margin, y - 3, pageWidth - 2 * margin, 14, "F");
    }

    const dueDate = new Date(inst.dueDate).toLocaleDateString();
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    const values = [
      inst.installmentNo.toString(),
      dueDate,
      fmt(Number(inst.amount)),
      fmt(Number(inst.principalPart)),
      fmt(Number(inst.interestPart)),
      fmt(Number(inst.outstandingBefore)),
      inst.status,
    ];
    values.forEach((v, i) => {
      const align = i === 0 ? "center" as const : "right" as const;
      doc.text(v, colPositions[i] + colWidths[i] / 2, y + 4, { align });
    });
    y += 14;
    rowCount++;
  }

  const buffer = Buffer.from(doc.output("arraybuffer"));

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="loan-${loan.loanNumber}.pdf"`,
    },
  });
}
