import { getDb } from "@/database/init";
import { formatDateStr, getMonthRange, getWeeksInMonth, isDateInFutureMonth, parseDateStr } from "@/utils/dateUtils";
import type { Transaction, TransactionType, TransactionWithCategory } from "@/types";
import { addDays, addMonths, differenceInCalendarDays } from "date-fns";

export type MonthYear = { month: number; year: number };
export type DueNotificationsSnapshot = {
  hasOverdue: boolean;
  hasDueToday: boolean;
  dueSoonInDays: number | null;
};

export type CreateTransactionParams = {
  type: TransactionType;
  name: string;
  amount: number;
  date: string;
  categoryId: number | null;
  note: string | null;
  fixedExpenseId?: number | null;
  installmentGroupId?: number | null;
  paid?: number;
  planned?: number;
};

export type UpdateTransactionParams = {
  id: number;
  type: TransactionType;
  name: string;
  amount: number;
  date: string;
  categoryId: number | null;
  note: string | null;
  fixedExpenseId?: number | null;
  installmentGroupId?: number | null;
  paid?: number;
  planned?: number;
};

export function getTransactionsByMonth({ month, year }: MonthYear): TransactionWithCategory[] {
  const db = getDb();
  const { startDate, endDate } = getMonthRange(month, year);

  const rows = db.getAllSync<{
    id: number;
    type: string;
    name: string;
    amount: number;
    date: string;
    category_id: number | null;
    note: string | null;
    fixed_expense_id: number | null;
    installment_group_id: number | null;
    paid: number | null;
    planned: number | null;
    category_name: string | null;
    category_color: string | null;
  }>(
    `SELECT t.id, t.type, t.name, t.amount, t.date, t.category_id, t.note,
            t.fixed_expense_id, t.installment_group_id, t.paid, t.planned,
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
    installment_group_id: r.installment_group_id ?? undefined,
    paid: r.paid ?? 0,
    planned: r.planned ?? 0,
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
    installment_group_id: number | null;
    paid: number | null;
    planned: number | null;
  }>("SELECT id, type, name, amount, date, category_id, note, fixed_expense_id, installment_group_id, paid, planned FROM transactions WHERE id = ?", id);
  if (!row) return null;
  return {
    ...row,
    type: row.type as TransactionType,
    fixed_expense_id: row.fixed_expense_id ?? undefined,
    installment_group_id: row.installment_group_id ?? undefined,
    paid: row.paid ?? 0,
    planned: row.planned ?? 0,
  };
}

export function createTransaction({
  type,
  name,
  amount,
  date,
  categoryId,
  note,
  fixedExpenseId,
  installmentGroupId,
  paid,
  planned,
}: CreateTransactionParams): number {
  const db = getDb();
  const result = db.runSync(
    "INSERT INTO transactions (type, name, amount, date, category_id, note, fixed_expense_id, installment_group_id, paid, planned) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    type,
    name,
    amount,
    date,
    categoryId,
    note ?? null,
    fixedExpenseId ?? null,
    installmentGroupId ?? null,
    paid ?? 0,
    planned ?? 0
  );
  return result.lastInsertRowId;
}

export function updateTransaction({
  id,
  type,
  name,
  amount,
  date,
  categoryId,
  note,
  fixedExpenseId,
  installmentGroupId,
  paid,
  planned,
}: UpdateTransactionParams): void {
  const db = getDb();
  db.runSync(
    "UPDATE transactions SET type = ?, name = ?, amount = ?, date = ?, category_id = ?, note = ?, fixed_expense_id = ?, installment_group_id = ?, paid = ?, planned = ? WHERE id = ?",
    type,
    name,
    amount,
    date,
    categoryId,
    note ?? null,
    fixedExpenseId ?? null,
    installmentGroupId ?? null,
    paid ?? 0,
    planned ?? 0,
    id
  );
}

export function updateTransactionInstallmentGroup({
  id,
  installmentGroupId,
}: {
  id: number;
  installmentGroupId: number | null;
}): void {
  const db = getDb();
  db.runSync(
    "UPDATE transactions SET installment_group_id = ? WHERE id = ?",
    installmentGroupId,
    id
  );
}

export function getInstallmentGroupTransactions(groupId: number): Transaction[] {
  const db = getDb();
  const rows = db.getAllSync<{
    id: number;
    type: string;
    name: string;
    amount: number;
    date: string;
    category_id: number | null;
    note: string | null;
    fixed_expense_id: number | null;
    installment_group_id: number | null;
    paid: number | null;
    planned: number | null;
  }>(
    `SELECT id, type, name, amount, date, category_id, note,
            fixed_expense_id, installment_group_id, paid, planned
     FROM transactions
     WHERE installment_group_id = ?
     ORDER BY date ASC, id ASC`,
    groupId
  );

  return rows.map((row) => ({
    ...row,
    type: row.type as TransactionType,
    fixed_expense_id: row.fixed_expense_id ?? undefined,
    installment_group_id: row.installment_group_id ?? undefined,
    paid: row.paid ?? 0,
    planned: row.planned ?? 0,
  }));
}

export function updateFutureInstallmentsFromAnchor({
  groupId,
  anchorId,
  anchorDate,
  baseName,
  amount,
  categoryId,
  note,
}: {
  groupId: number;
  anchorId: number;
  anchorDate: string;
  baseName: string;
  amount: number;
  categoryId: number | null;
  note: string | null;
}): void {
  const groupTransactions = getInstallmentGroupTransactions(groupId);
  const anchorIndex = groupTransactions.findIndex((tx) => tx.id === anchorId);
  if (anchorIndex < 0) return;

  const todayStr = formatDateStr(new Date());
  const anchorDateObj = parseDateStr(anchorDate);
  const totalInstallments = groupTransactions.length;
  let monthOffset = 1;

  for (let i = anchorIndex + 1; i < groupTransactions.length; i += 1) {
    const tx = groupTransactions[i];
    if ((tx.date ?? "") <= todayStr) continue;

    const recalculatedDate = formatDateStr(addMonths(anchorDateObj, monthOffset));
    const recalculatedPlanned = isDateInFutureMonth(recalculatedDate) ? 1 : 0;
    const recalculatedName = `${baseName} (${i + 1}/${totalInstallments})`;

    updateTransaction({
      id: tx.id,
      type: tx.type,
      name: recalculatedName,
      amount,
      date: recalculatedDate,
      categoryId,
      note,
      fixedExpenseId: tx.fixed_expense_id ?? undefined,
      installmentGroupId: groupId,
      paid: tx.paid ?? 0,
      planned: recalculatedPlanned,
    });
    monthOffset += 1;
  }
}

export function deleteInstallmentsFromAnchor({
  groupId,
  anchorId,
}: {
  groupId: number;
  anchorId: number;
}): void {
  const groupTransactions = getInstallmentGroupTransactions(groupId);
  const anchorIndex = groupTransactions.findIndex((tx) => tx.id === anchorId);
  if (anchorIndex < 0) {
    deleteTransaction(anchorId);
    return;
  }

  const todayStr = formatDateStr(new Date());
  for (let i = anchorIndex; i < groupTransactions.length; i += 1) {
    const tx = groupTransactions[i];
    const shouldDeleteCurrent = tx.id === anchorId;
    const shouldDeleteFutureUnpaid =
      (tx.date ?? "") > todayStr && (tx.paid ?? 0) !== 1;
    if (shouldDeleteCurrent || shouldDeleteFutureUnpaid) {
      deleteTransaction(tx.id);
    }
  }
}

export function updateTransactionPaid({ id, paid }: { id: number; paid: number }): void {
  const db = getDb();
  db.runSync("UPDATE transactions SET paid = ? WHERE id = ?", paid, id);
}

export function deleteTransaction(id: number): void {
  const db = getDb();
  db.runSync("DELETE FROM transactions WHERE id = ?", id);
}

export function getDueNotificationsSnapshot(): DueNotificationsSnapshot {
  const db = getDb();
  const todayDate = parseDateStr(formatDateStr(new Date()));
  const todayStr = formatDateStr(todayDate);
  const tomorrowStr = formatDateStr(addDays(todayDate, 1));
  const sevenDaysAheadStr = formatDateStr(addDays(todayDate, 7));

  const baseWhere = `
    type = 'expense'
    AND COALESCE(paid, 0) != 1
    AND (COALESCE(planned, 0) = 1 OR fixed_expense_id IS NOT NULL)
  `;

  const overdueRow = db.getFirstSync<{ count: number }>(
    `SELECT COUNT(1) as count FROM transactions
     WHERE ${baseWhere} AND date < ?`,
    todayStr
  );
  const dueTodayRow = db.getFirstSync<{ count: number }>(
    `SELECT COUNT(1) as count FROM transactions
     WHERE ${baseWhere} AND date = ?`,
    todayStr
  );
  const dueSoonMinRow = db.getFirstSync<{ min_date: string | null }>(
    `SELECT MIN(date) as min_date FROM transactions
     WHERE ${baseWhere} AND date >= ? AND date <= ?`,
    tomorrowStr,
    sevenDaysAheadStr
  );

  const minDate = dueSoonMinRow?.min_date ?? null;
  const dueSoonInDays =
    minDate == null
      ? null
      : differenceInCalendarDays(parseDateStr(minDate), todayDate);

  return {
    hasOverdue: (overdueRow?.count ?? 0) > 0,
    hasDueToday: (dueTodayRow?.count ?? 0) > 0,
    dueSoonInDays: dueSoonInDays != null && dueSoonInDays >= 1 && dueSoonInDays <= 7
      ? dueSoonInDays
      : null,
  };
}

export function getMonthlyTotals({ month, year }: MonthYear): { income: number; expense: number; balance: number } {
  const db = getDb();
  const { startDate, endDate } = getMonthRange(month, year);

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

export function getIncomeBySource({ month, year }: MonthYear): { source: string; amount: number; color: string }[] {
  const db = getDb();
  const { startDate, endDate } = getMonthRange(month, year);

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

export function getCategorySpendingByMonth({ month, year }: MonthYear): { categoryId: number; categoryName: string; spent: number; limit: number | null; color: string }[] {
  const db = getDb();
  const { startDate, endDate } = getMonthRange(month, year);

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

export function getCategorySpendingByWeek({ month, year }: MonthYear): {
  categoryId: number;
  categoryName: string;
  spent: number;
  limit: number | null;
  color: string;
  weekly: number[];
}[] {
  const db = getDb();
  const weeks = getWeeksInMonth(month, year);
  const categoryData = getCategorySpendingByMonth({ month, year });

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
