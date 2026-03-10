import { format } from "date-fns";
import { getDb } from "@/database/init";
import type { FixedExpense, PaymentMethod } from "@/types";
import {
  createTransaction,
  updateTransaction,
  getTransactionsByMonth,
} from "@/services/transactionService";
import { getBankAccountById } from "@/services/bankAccountService";

export interface FixedExpenseWithCategory extends FixedExpense {
  category_name?: string;
  category_color?: string;
  account_name?: string;
}

export function getAllFixedExpenses(): FixedExpenseWithCategory[] {
  const db = getDb();
  const rows = db.getAllSync<{
    id: number;
    name: string;
    amount: number;
    due_day: number;
    category_id: number | null;
    note: string | null;
    account_id: number | null;
    payment_method: string | null;
    category_name: string | null;
    category_color: string | null;
    account_name: string | null;
  }>(
    `SELECT f.id, f.name, f.amount, f.due_day, f.category_id, f.note,
            f.account_id, f.payment_method,
            c.name as category_name, c.color as category_color,
            b.name as account_name
     FROM fixed_expenses f
     LEFT JOIN categories c ON f.category_id = c.id
     LEFT JOIN bank_accounts b ON f.account_id = b.id
     ORDER BY f.due_day, f.name`
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    amount: r.amount,
    due_day: r.due_day,
    category_id: r.category_id,
    note: r.note,
    account_id: r.account_id ?? null,
    payment_method: (r.payment_method as PaymentMethod | null) ?? null,
    category_name: r.category_name ?? undefined,
    category_color: r.category_color ?? undefined,
    account_name: r.account_name ?? undefined,
  }));
}

export function getFixedExpenseById(id: number): FixedExpense | null {
  const db = getDb();
  const row = db.getFirstSync<{
    id: number;
    name: string;
    amount: number;
    due_day: number;
    category_id: number | null;
    note: string | null;
    account_id: number | null;
    payment_method: string | null;
  }>(
    "SELECT id, name, amount, due_day, category_id, note, account_id, payment_method FROM fixed_expenses WHERE id = ?",
    id
  );
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    due_day: row.due_day,
    category_id: row.category_id,
    note: row.note,
    account_id: row.account_id ?? null,
    payment_method: (row.payment_method as PaymentMethod | null) ?? null,
  };
}

export type CreateFixedExpenseParams = {
  name: string;
  amount: number;
  due_day: number;
  category_id: number | null;
  note: string | null;
  account_id: number | null;
  payment_method: PaymentMethod | null;
};

export type UpdateFixedExpenseParams = {
  id: number;
  name: string;
  amount: number;
  due_day: number;
  category_id: number | null;
  note: string | null;
  account_id: number | null;
  payment_method: PaymentMethod | null;
};

export function createFixedExpense({
  name,
  amount,
  due_day,
  category_id,
  note,
  account_id,
  payment_method,
}: CreateFixedExpenseParams): number {
  const db = getDb();
  const result = db.runSync(
    "INSERT INTO fixed_expenses (name, amount, due_day, category_id, note, account_id, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?)",
    name,
    amount,
    due_day,
    category_id,
    note ?? null,
    account_id ?? null,
    payment_method ?? null
  );
  return result.lastInsertRowId;
}

export function updateFixedExpense({
  id,
  name,
  amount,
  due_day,
  category_id,
  note,
  account_id,
  payment_method,
}: UpdateFixedExpenseParams): void {
  const db = getDb();
  db.runSync(
    "UPDATE fixed_expenses SET name = ?, amount = ?, due_day = ?, category_id = ?, note = ?, account_id = ?, payment_method = ? WHERE id = ?",
    name,
    amount,
    due_day,
    category_id,
    note ?? null,
    account_id ?? null,
    payment_method ?? null,
    id
  );
}

export function deleteFixedExpense(id: number): void {
  const db = getDb();
  // Pagamento efetuado: desvincula o gasto fixo (mantém a transação)
  db.runSync(
    "UPDATE transactions SET fixed_expense_id = NULL WHERE fixed_expense_id = ? AND paid = 1",
    id
  );
  // Pagamento pendente: exclui a transação
  db.runSync(
    "DELETE FROM transactions WHERE fixed_expense_id = ? AND (paid = 0 OR paid IS NULL)",
    id
  );
  db.runSync("DELETE FROM fixed_expenses WHERE id = ?", id);
}

export type ImportFixedExpensesParams = { month: number; year: number };

export function importFixedExpensesToMonth({ month, year }: ImportFixedExpensesParams): { created: number; updated: number } {
  const fixedExpenses = getAllFixedExpenses();
  const transactions = getTransactionsByMonth({ month, year });
  const fixedTxByFeId = new Map<number, (typeof transactions)[0]>();
  for (const tx of transactions) {
    if (tx.fixed_expense_id != null) {
      fixedTxByFeId.set(tx.fixed_expense_id, tx);
    }
  }

  let created = 0;
  let updated = 0;

  const targetInvoiceMonth = `${year}-${String(month + 1).padStart(2, "0")}`;

  for (const fe of fixedExpenses) {
    const date = format(new Date(year, month, fe.due_day), "yyyy-MM-dd");
    const existing = fixedTxByFeId.get(fe.id);

    const accountId = fe.account_id ?? null;
    const paymentMethod = fe.payment_method ?? null;
    const invoiceMonthForTx: string | null =
      paymentMethod === "credit" ? targetInvoiceMonth : null;

    if (existing) {
      updateTransaction({
        id: existing.id,
        type: "expense",
        name: fe.name,
        amount: fe.amount,
        date: existing.date,
        categoryId: fe.category_id,
        note: fe.note,
        fixedExpenseId: fe.id,
        paid: existing.paid ?? 0,
        planned: 0,
        accountId: accountId ?? existing.account_id ?? undefined,
        paymentMethod: paymentMethod ?? (existing.payment_method as PaymentMethod | null) ?? undefined,
        invoiceMonth: invoiceMonthForTx ?? undefined,
      });
      updated++;
    } else {
      createTransaction({
        type: "expense",
        name: fe.name,
        amount: fe.amount,
        date,
        categoryId: fe.category_id,
        note: fe.note,
        fixedExpenseId: fe.id,
        paid: 0,
        planned: 0,
        accountId: accountId ?? undefined,
        paymentMethod: paymentMethod ?? undefined,
        invoiceMonth: invoiceMonthForTx ?? undefined,
      });
      created++;
    }
  }

  return { created, updated };
}
