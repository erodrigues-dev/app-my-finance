import { getDb } from "@/database/init";
import type { FixedExpense } from "@/types";
import {
  createTransaction,
  updateTransaction,
  getTransactionsByMonth,
} from "@/services/transactionService";

export interface FixedExpenseWithCategory extends FixedExpense {
  category_name?: string;
  category_color?: string;
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
    category_name: string | null;
    category_color: string | null;
  }>(
    `SELECT f.id, f.name, f.amount, f.due_day, f.category_id, f.note,
            c.name as category_name, c.color as category_color
     FROM fixed_expenses f
     LEFT JOIN categories c ON f.category_id = c.id
     ORDER BY f.due_day, f.name`
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    amount: r.amount,
    due_day: r.due_day,
    category_id: r.category_id,
    note: r.note,
    category_name: r.category_name ?? undefined,
    category_color: r.category_color ?? undefined,
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
  }>("SELECT id, name, amount, due_day, category_id, note FROM fixed_expenses WHERE id = ?", id);
  return row ?? null;
}

export function createFixedExpense(
  name: string,
  amount: number,
  due_day: number,
  category_id: number | null,
  note: string | null
): number {
  const db = getDb();
  const result = db.runSync(
    "INSERT INTO fixed_expenses (name, amount, due_day, category_id, note) VALUES (?, ?, ?, ?, ?)",
    name,
    amount,
    due_day,
    category_id,
    note ?? null
  );
  return result.lastInsertRowId;
}

export function updateFixedExpense(
  id: number,
  name: string,
  amount: number,
  due_day: number,
  category_id: number | null,
  note: string | null
): void {
  const db = getDb();
  db.runSync(
    "UPDATE fixed_expenses SET name = ?, amount = ?, due_day = ?, category_id = ?, note = ? WHERE id = ?",
    name,
    amount,
    due_day,
    category_id,
    note ?? null,
    id
  );
}

export function deleteFixedExpense(id: number): void {
  const db = getDb();
  db.runSync("UPDATE transactions SET fixed_expense_id = NULL WHERE fixed_expense_id = ?", id);
  db.runSync("DELETE FROM fixed_expenses WHERE id = ?", id);
}

export function importFixedExpensesToMonth(
  month: number,
  year: number
): { created: number; updated: number } {
  const fixedExpenses = getAllFixedExpenses();
  const transactions = getTransactionsByMonth(month, year);
  const fixedTxByFeId = new Map<number, (typeof transactions)[0]>();
  for (const tx of transactions) {
    if (tx.fixed_expense_id != null) {
      fixedTxByFeId.set(tx.fixed_expense_id, tx);
    }
  }

  let created = 0;
  let updated = 0;

  for (const fe of fixedExpenses) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(fe.due_day).padStart(2, "0")}`;
    const existing = fixedTxByFeId.get(fe.id);

    if (existing) {
      updateTransaction(
        existing.id,
        "expense",
        fe.name,
        fe.amount,
        existing.date,
        fe.category_id,
        fe.note,
        fe.id,
        existing.paid ?? 0
      );
      updated++;
    } else {
      createTransaction(
        "expense",
        fe.name,
        fe.amount,
        date,
        fe.category_id,
        fe.note,
        fe.id,
        0
      );
      created++;
    }
  }

  return { created, updated };
}
