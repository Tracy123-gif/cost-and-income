import { prisma } from "../prisma";

export const EXPENSE_CATEGORIES = [
  "Transport",
  "Electricity",
  "Rent",
  "Internet",
  "Salaries",
  "Marketing",
  "Equipment maintenance",
  "Miscellaneous",
] as const;

export interface RecordExpenseInput {
  businessId: string;
  category: string;
  amount: string;
  expenseDate?: Date;
  note?: string;
}

export async function recordExpense(input: RecordExpenseInput) {
  return prisma.expense.create({
    data: {
      businessId: input.businessId,
      category: input.category,
      amount: input.amount,
      expenseDate: input.expenseDate ?? new Date(),
      note: input.note,
    },
  });
}

export async function listExpenses(businessId: string, range?: { from: Date; to: Date }) {
  return prisma.expense.findMany({
    where: {
      businessId,
      ...(range ? { expenseDate: { gte: range.from, lte: range.to } } : {}),
    },
    orderBy: { expenseDate: "desc" },
  });
}
