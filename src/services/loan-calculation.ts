export interface InstallmentRow {
  installmentNo: number;
  dueDate: Date;
  amount: number;
  principalPart: number;
  interestPart: number;
  outstandingBefore: number;
  outstandingAfter: number;
}

export interface CalculationResult {
  emiAmount: number;
  totalInterest: number;
  totalPayable: number;
  installments: InstallmentRow[];
}

function toMonthlyRate(annualRate: number): number {
  return annualRate / 100 / 12;
}

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

export function calculateReducingBalance(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  startDate: Date = new Date()
): CalculationResult {
  const r = toMonthlyRate(annualRate);
  const n = tenureMonths;

  const emiAmount = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const roundedEmi = Math.round(emiAmount * 100) / 100;

  let balance = principal;
  const installments: InstallmentRow[] = [];

  for (let i = 1; i <= n; i++) {
    const interestPart = Math.round(balance * r * 100) / 100;
    let principalPart = roundedEmi - interestPart;

    if (i === n) {
      principalPart = balance;
    }

    const outstandingBefore = Math.round(balance * 100) / 100;
    balance -= principalPart;
    const outstandingAfter = Math.round(balance * 100) / 100;

    const amount = Math.round((principalPart + interestPart) * 100) / 100;

    installments.push({
      installmentNo: i,
      dueDate: addMonths(startDate, i),
      amount,
      principalPart: Math.round(principalPart * 100) / 100,
      interestPart,
      outstandingBefore,
      outstandingAfter: Math.max(0, outstandingAfter),
    });
  }

  const totalPayable = installments.reduce((s, inst) => s + inst.amount, 0);
  const totalInterest = installments.reduce((s, inst) => s + inst.interestPart, 0);

  return {
    emiAmount: roundedEmi,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPayable: Math.round(totalPayable * 100) / 100,
    installments,
  };
}

export function calculateFlatRate(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  startDate: Date = new Date()
): CalculationResult {
  const r = toMonthlyRate(annualRate);
  const n = tenureMonths;

  const totalInterest = principal * r * n;
  const totalPayable = principal + totalInterest;
  const emiAmount = totalPayable / n;

  const roundedEmi = Math.round(emiAmount * 100) / 100;
  const monthlyPrincipal = principal / n;
  const monthlyInterest = totalInterest / n;

  let balance = principal;
  const installments: InstallmentRow[] = [];

  for (let i = 1; i <= n; i++) {
    const outstandingBefore = Math.round(balance * 100) / 100;
    balance -= monthlyPrincipal;
    const outstandingAfter = Math.round(balance * 100) / 100;

    installments.push({
      installmentNo: i,
      dueDate: addMonths(startDate, i),
      amount: roundedEmi,
      principalPart: Math.round(monthlyPrincipal * 100) / 100,
      interestPart: Math.round(monthlyInterest * 100) / 100,
      outstandingBefore,
      outstandingAfter: Math.max(0, outstandingAfter),
    });
  }

  return {
    emiAmount: roundedEmi,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPayable: Math.round(totalPayable * 100) / 100,
    installments,
  };
}

export function calculateEqualPrincipal(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  startDate: Date = new Date()
): CalculationResult {
  const r = toMonthlyRate(annualRate);
  const n = tenureMonths;

  const monthlyPrincipal = principal / n;
  let balance = principal;
  const installments: InstallmentRow[] = [];

  for (let i = 1; i <= n; i++) {
    const interestPart = Math.round(balance * r * 100) / 100;
    const principalPart = Math.round(monthlyPrincipal * 100) / 100;
    const amount = Math.round((principalPart + interestPart) * 100) / 100;
    const outstandingBefore = Math.round(balance * 100) / 100;
    balance -= monthlyPrincipal;
    const outstandingAfter = Math.round(balance * 100) / 100;

    installments.push({
      installmentNo: i,
      dueDate: addMonths(startDate, i),
      amount,
      principalPart,
      interestPart,
      outstandingBefore,
      outstandingAfter: Math.max(0, outstandingAfter),
    });
  }

  const totalPayable = installments.reduce((s, inst) => s + inst.amount, 0);
  const totalInterest = installments.reduce((s, inst) => s + inst.interestPart, 0);

  return {
    emiAmount: installments[0].amount,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPayable: Math.round(totalPayable * 100) / 100,
    installments,
  };
}

export function calculateLoan(
  method: string,
  principal: number,
  annualRate: number,
  tenureMonths: number,
  startDate?: Date
): CalculationResult {
  switch (method) {
    case "FLAT_RATE":
      return calculateFlatRate(principal, annualRate, tenureMonths, startDate);
    case "EQUAL_PRINCIPAL":
      return calculateEqualPrincipal(principal, annualRate, tenureMonths, startDate);
    case "REDUCING_BALANCE":
    default:
      return calculateReducingBalance(principal, annualRate, tenureMonths, startDate);
  }
}
