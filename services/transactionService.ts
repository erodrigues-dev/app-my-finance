import { getDb } from "@/database/init";
import type { Transaction, TransactionType, TransactionWithCategory } from "@/types";

export function getTransactionsByMonth(
  month: number,
  year: number
): TransactionWithCategory[] {
  const db = getDb();
  const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const endDate =
    month === 11
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 2).padStart(2, "0")}-01`;

  const rows = db.getAllSync<{
    id: number;
    type: string;
    name: string;
    amount: number;
    date: string;
    category_id: number | null;
    note: string | null;
    fixed_expense_id: number | null;
    paid: number | null;
    category_name: string | null;
    category_color: string | null;
  }>(
    `SELECT t.id, t.type, t.name, t.amount, t.date, t.category_id, t.note,
            t.fixed_expense_id, t.paid,
            c.name as category_name, c.color as category_color
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     WHERE t.date >= ? AND t.date < ?
     ORDER BY t.date DESC, t.id DESC`,
    startDate,
    endDate
  );

  return rows.map((r) => ({
    id: r.id,
    type: r.type as TransactionType,
    name: r.name,
    amount: r.amount,
    date: r.date,
    category_id: r.category_id,
    note: r.note,
    fixed_expense_id: r.fixed_expense_id ?? undefined,
    paid: r.paid ?? 0,
    category_name: r.category_name ?? undefined,
    category_color: r.category_color ?? undefined,
  }));
}

export function getTransactionById(id: number): Transaction | null {
  const db = getDb();
  const row = db.getFirstSync<{
    id: number;
    type: string;
    name: string;
    amount: number;
    date: string;
    category_id: number | null;
    note: string | null;
    fixed_expense_id: number | null;
    paid: number | null;
  }>("SELECT id, type, name, amount, date, category_id, note, fixed_expense_id, paid FROM transactions WHERE id = ?", id);
  if (!row) return null;
  return {
    ...row,
    type: row.type as TransactionType,
    fixed_expense_id: row.fixed_expense_id ?? undefined,
    paid: row.paid ?? 0,
  };
}

export function createTransaction(
  type: TransactionType,
  name: string,
  amount: number,
  date: string,
  categoryId: number | null,
  note: string | null,
  fixedExpenseId?: number | null,
  paid?: number
): number {
  const db = getDb();
  const result = db.runSync(
    "INSERT INTO transactions (type, name, amount, date, category_id, note, fixed_expense_id, paid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    type,
    name,
    amount,
    date,
    categoryId,
    note ?? null,
    fixedExpenseId ?? null,
    paid ?? 0
  );
  return result.lastInsertRowId;
}

export function updateTransaction(
  id: number,
  type: TransactionType,
  name: string,
  amount: number,
  date: string,
  categoryId: number | null,
  note: string | null,
  fixedExpenseId?: number | null,
  paid?: number
): void {
  const db = getDb();
  db.runSync(
    "UPDATE transactions SET type = ?, name = ?, amount = ?, date = ?, category_id = ?, note = ?, fixed_expense_id = ?, paid = ? WHERE id = ?",
    type,
    name,
    amount,
    date,
    categoryId,
    note ?? null,
    fixedExpenseId ?? null,
    paid ?? 0,
    id
  );
}

export function updateTransactionPaid(id: number, paid: number): void {
  const db = getDb();
  db.runSync("UPDATE transactions SET paid = ? WHERE id = ?", paid, id);
}

export function deleteTransaction(id: number): void {
  const db = getDb();
  db.runSync("DELETE FROM transactions WHERE id = ?", id);
}

export function getMonthlyTotals(
  month: number,
  year: number
): { income: number; expense: number; balance: number } {
  const db = getDb();
  const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const endDate =
    month === 11 ? `${year + 1}-01-01` : `${year}-${String(month + 2).padStart(2, "0")}-01`;

  const incomeRow = db.getFirstSync<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income' AND date >= ? AND date < ?",
    startDate,
    endDate
  );
  const expenseRow = db.getFirstSync<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date >= ? AND date < ?",
    startDate,
    endDate
  );

  const income = incomeRow?.total ?? 0;
  const expense = expenseRow?.total ?? 0;
  return { income, expense, balance: income - expense };
}

export function getIncomeBySource(
  month: number,
  year: number
): { source: string; amount: number; color: string }[] {
  const db = getDb();
  const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const endDate =
    month === 11 ? `${year + 1}-01-01` : `${year}-${String(month + 2).padStart(2, "0")}-01`;

  const rows = db.getAllSync<{ name: string; amount: number }>(
    `SELECT name, COALESCE(SUM(amount), 0) as amount
     FROM transactions
     WHERE type = 'income' AND date >= ? AND date < ?
     GROUP BY name
     HAVING amount > 0
     ORDER BY amount DESC`,
    startDate,
    endDate
  );

  const INCOME_COLORS = [
    "#50FA7B", "#8BE9FD", "#BD93F9", "#FF79C6", "#F1FA8C",
    "#FFB86C", "#6272A4", "#A4D4AE",
  ];

  return rows.map((r, i) => ({
    source: r.name || "Outros",
    amount: r.amount,
    color: INCOME_COLORS[i % INCOME_COLORS.length],
  }));
}

export function getCategorySpendingByMonth(
  month: number,
  year: number
): { categoryId: number; categoryName: string; spent: number; limit: number | null; color: string }[] {
  const db = getDb();
  const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const endDate =
    month === 11 ? `${year + 1}-01-01` : `${year}-${String(month + 2).padStart(2, "0")}-01`;

  const rows = db.getAllSync<{
    category_id: number;
    category_name: string;
    spent: number;
    category_limit: number | null;
    category_color: string;
  }>(
    `SELECT c.id as category_id, c.name as category_name,
            COALESCE(SUM(t.amount), 0) as spent,
            c.spending_limit as category_limit, c.color as category_color
     FROM categories c
     LEFT JOIN transactions t ON t.category_id = c.id AND t.type = 'expense' AND t.date >= ? AND t.date < ?
     GROUP BY c.id, c.name, c.spending_limit, c.color
     HAVING spent > 0`,
    startDate,
    endDate
  );

  return rows
    .filter((r) => r.spent > 0 || r.category_id)
    .map((r) => ({
      categoryId: r.category_id,
      categoryName: r.category_name,
      spent: r.spent,
      limit: r.category_limit,
      color: r.category_color,
    }));
}

function getWeeksInMonth(month: number, year: number): { start: string; end: string }[] {
  const weeks: { start: string; end: string }[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let w = 0; w < 5; w++) {
    const startDay = w * 7 + 1;
    if (startDay > daysInMonth) break;
    const endDay = Math.min(startDay + 6, daysInMonth);
    const start = `${year}-${String(month + 1).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`;
    const endDayNext = endDay + 1;
    const end =
      endDayNext > daysInMonth
        ? month === 11
          ? `${year + 1}-01-01`
          : `${year}-${String(month + 2).padStart(2, "0")}-01`
        : `${year}-${String(month + 1).padStart(2, "0")}-${String(endDayNext).padStart(2, "0")}`;
    weeks.push({ start, end });
  }
  return weeks;
}

export function getCategorySpendingByWeek(
  month: number,
  year: number
): {
  categoryId: number;
  categoryName: string;
  spent: number;
  limit: number | null;
  color: string;
  weekly: number[];
}[] {
  const db = getDb();
  const weeks = getWeeksInMonth(month, year);
  const categoryData = getCategorySpendingByMonth(month, year);

  return categoryData.map((cat) => {
    const weekly = weeks.map(({ start, end }) => {
      const row = db.getFirstSync<{ spent: number }>(
        `SELECT COALESCE(SUM(t.amount), 0) as spent
         FROM transactions t
         WHERE t.category_id = ? AND t.type = 'expense' AND t.date >= ? AND t.date < ?`,
        cat.categoryId,
        start,
        end
      );
      return row?.spent ?? 0;
    });
    return {
      ...cat,
      weekly,
    };
  });
}
