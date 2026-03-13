import { getDb } from '@/database/init';
import {
  enqueueExpenseDelete,
  enqueueExpenseUpsert,
} from '@/services/remoteNotificationSyncService';
import type {
  Transaction,
  TransactionType,
  TransactionWithCategory,
} from '@/types';
import {
  formatDateStr,
  getMonthRange,
  getWeeksInMonth,
  getInvoiceDueDate,
  getInvoiceMonth,
  isDateInFutureMonth,
  parseDateStr,
} from '@/utils/dateUtils';
import { addDays, addMonths, subDays } from 'date-fns';
import { getBankAccountById } from '@/services/bankAccountService';
import { getCreditInvoicePaid } from '@/services/bankAccountService';

export type MonthYear = { month: number; year: number };
export type UpcomingExpenseSyncPayload = {
  expenseId: string;
  dueDate: string;
  title: string;
  status: 'pending' | 'paid';
  updatedAt: string;
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
  accountId?: number | null;
  paymentMethod?: 'credit' | 'debit' | 'pix' | null;
  invoiceMonth?: string | null;
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
  accountId?: number | null;
  paymentMethod?: 'credit' | 'debit' | 'pix' | null;
  invoiceMonth?: string | null;
};

type SyncCandidateRow = {
  id: number;
  type: string;
  name: string;
  amount: number;
  date: string;
  paid: number | null;
  planned: number | null;
  fixed_expense_id: number | null;
};

/** Só despesas planejadas (planned=1) ou gastos fixos (fixed_expense_id não nulo) entram na sync/notificação. */
function isSyncEligible(row: SyncCandidateRow): boolean {
  return (row.planned ?? 0) === 1 || row.fixed_expense_id != null;
}

function getSyncCandidateById(id: number): SyncCandidateRow | null {
  const db = getDb();
  return (
    db.getFirstSync<SyncCandidateRow>(
      'SELECT id, type, name, amount, date, paid, planned, fixed_expense_id FROM transactions WHERE id = ?',
      id,
    ) ?? null
  );
}

function buildSyncPayloadFromRow(
  row: SyncCandidateRow,
): UpcomingExpenseSyncPayload | null {
  if (row.type !== 'expense') return null;
  if ((row.paid ?? 0) === 1) return null;

  return {
    expenseId: String(row.id),
    dueDate: row.date,
    title: row.name,
    status: 'pending',
    updatedAt: new Date().toISOString(),
  };
}

function queueSyncByTransactionId(id: number): void {
  try {
    const row = getSyncCandidateById(id);
    if (!row) {
      void enqueueExpenseDelete(String(id));
      return;
    }
    if (!isSyncEligible(row)) return;
    const payload = buildSyncPayloadFromRow(row);
    if (!payload) {
      void enqueueExpenseDelete(String(id));
      return;
    }
    void enqueueExpenseUpsert(payload);
  } catch (error) {
    console.error('[MyFinanceSync] Falha ao enfileirar sync de transação', {
      operation: 'queueSyncByTransactionId',
      transactionId: id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function getTransactionsByMonth({
  month,
  year,
}: MonthYear): TransactionWithCategory[] {
  const db = getDb();
  const { startDate, endDate } = getMonthRange(month, year);
  const invoiceMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

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
    account_id: number | null;
    payment_method: string | null;
    invoice_month: string | null;
    category_name: string | null;
    category_color: string | null;
    account_name: string | null;
  }>(
    `SELECT t.id, t.type, t.name, t.amount, t.date, t.category_id, t.note,
            t.fixed_expense_id, t.installment_group_id, t.paid, t.planned,
            t.account_id, t.payment_method, t.invoice_month,
            c.name as category_name, c.color as category_color,
            b.name as account_name
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN bank_accounts b ON t.account_id = b.id
     WHERE (
       (t.date >= ? AND t.date < ? AND (t.payment_method IS NULL OR t.payment_method != 'credit'))
       OR (t.payment_method = 'credit' AND t.invoice_month = ?)
     )
     ORDER BY t.date DESC, t.id DESC`,
    startDate,
    endDate,
    invoiceMonthStr,
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
    account_id: r.account_id ?? undefined,
    payment_method: (r.payment_method as 'credit' | 'debit' | 'pix') ?? undefined,
    invoice_month: r.invoice_month ?? undefined,
    category_name: r.category_name ?? undefined,
    category_color: r.category_color ?? undefined,
    account_name: r.account_name ?? undefined,
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
    account_id: number | null;
    payment_method: string | null;
    invoice_month: string | null;
  }>(
    'SELECT id, type, name, amount, date, category_id, note, fixed_expense_id, installment_group_id, paid, planned, account_id, payment_method, invoice_month FROM transactions WHERE id = ?',
    id,
  );
  if (!row) return null;
  return {
    ...row,
    type: row.type as TransactionType,
    fixed_expense_id: row.fixed_expense_id ?? undefined,
    installment_group_id: row.installment_group_id ?? undefined,
    paid: row.paid ?? 0,
    planned: row.planned ?? 0,
    account_id: row.account_id ?? undefined,
    payment_method: (row.payment_method as 'credit' | 'debit' | 'pix') ?? undefined,
    invoice_month: row.invoice_month ?? undefined,
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
  accountId,
  paymentMethod,
  invoiceMonth,
}: CreateTransactionParams): number {
  const db = getDb();
  const result = db.runSync(
    'INSERT INTO transactions (type, name, amount, date, category_id, note, fixed_expense_id, installment_group_id, paid, planned, account_id, payment_method, invoice_month) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
    accountId ?? null,
    paymentMethod ?? null,
    invoiceMonth ?? null,
  );
  if (type === 'expense') {
    queueSyncByTransactionId(result.lastInsertRowId);
  }
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
  accountId,
  paymentMethod,
  invoiceMonth,
}: UpdateTransactionParams): void {
  const db = getDb();
  db.runSync(
    'UPDATE transactions SET type = ?, name = ?, amount = ?, date = ?, category_id = ?, note = ?, fixed_expense_id = ?, installment_group_id = ?, paid = ?, planned = ?, account_id = ?, payment_method = ?, invoice_month = ? WHERE id = ?',
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
    accountId ?? null,
    paymentMethod ?? null,
    invoiceMonth ?? null,
    id,
  );
  if (type === 'expense') {
    queueSyncByTransactionId(id);
  } else {
    void enqueueExpenseDelete(String(id));
  }
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
    'UPDATE transactions SET installment_group_id = ? WHERE id = ?',
    installmentGroupId,
    id,
  );
  queueSyncByTransactionId(id);
}

export function getInstallmentGroupTransactions(
  groupId: number,
): Transaction[] {
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
    groupId,
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
  accountId,
  paymentMethod,
}: {
  groupId: number;
  anchorId: number;
  anchorDate: string;
  baseName: string;
  amount: number;
  categoryId: number | null;
  note: string | null;
  accountId?: number | null;
  paymentMethod?: 'credit' | 'debit' | 'pix' | null;
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
    if ((tx.date ?? '') <= todayStr) continue;

    const recalculatedDate = formatDateStr(
      addMonths(anchorDateObj, monthOffset),
    );
    const recalculatedPlanned = isDateInFutureMonth(recalculatedDate) ? 1 : 0;
    const recalculatedName = `${baseName} (${i + 1}/${totalInstallments})`;
    let recalculatedInvoiceMonth: string | null = null;
    if (paymentMethod === 'credit' && accountId) {
      const acc = getBankAccountById(accountId);
      if (acc?.credit_enabled === 1 && acc.closing_day != null) {
        recalculatedInvoiceMonth = getInvoiceMonth(recalculatedDate, acc.closing_day);
      }
    }

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
      accountId: accountId ?? undefined,
      paymentMethod: paymentMethod ?? undefined,
      invoiceMonth: recalculatedInvoiceMonth ?? undefined,
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
      (tx.date ?? '') > todayStr && (tx.paid ?? 0) !== 1;
    if (shouldDeleteCurrent || shouldDeleteFutureUnpaid) {
      deleteTransaction(tx.id);
    }
  }
}

export function updateTransactionPaid({
  id,
  paid,
}: {
  id: number;
  paid: number;
}): void {
  const db = getDb();
  db.runSync('UPDATE transactions SET paid = ? WHERE id = ?', paid, id);
  queueSyncByTransactionId(id);
}

export function deleteTransaction(id: number): void {
  const db = getDb();
  void enqueueExpenseDelete(String(id));
  db.runSync('DELETE FROM transactions WHERE id = ?', id);
}

export function buildInvoiceSyncPayload(
  accountId: number,
  invoiceMonth: string,
  status: 'pending' | 'paid',
): UpcomingExpenseSyncPayload {
  const account = getBankAccountById(accountId);
  const dueDate =
    account?.due_day != null
      ? getInvoiceDueDate(invoiceMonth, account.due_day)
      : formatDateStr(addDays(new Date(), 7));
  return {
    expenseId: `invoice-${accountId}-${invoiceMonth}`,
    dueDate,
    title: `Fatura ${account?.name ?? 'Conta'} ${invoiceMonth}`,
    status,
    updatedAt: new Date().toISOString(),
  };
}

export function getUpcomingExpensesForRemoteSync(): UpcomingExpenseSyncPayload[] {
  const db = getDb();
  const today = new Date();
  const minDateStr = formatDateStr(subDays(today, 30));
  const maxDateStr = formatDateStr(addDays(today, 30));

  const rows = db.getAllSync<SyncCandidateRow>(
    `SELECT id, type, name, amount, date, paid, planned, fixed_expense_id
     FROM transactions
     WHERE type = 'expense'
       AND COALESCE(paid, 0) != 1
       AND (planned = 1 OR fixed_expense_id IS NOT NULL)
       AND date >= ?
     ORDER BY date ASC`,
    minDateStr,
  );
  const payloads: UpcomingExpenseSyncPayload[] = [];
  for (const row of rows) {
    const payload = buildSyncPayloadFromRow(row);
    if (payload) payloads.push(payload);
  }

  const invoiceRows = db.getAllSync<{ account_id: number; invoice_month: string }>(
    `SELECT DISTINCT account_id, invoice_month
     FROM transactions
     WHERE payment_method = 'credit'
       AND account_id IS NOT NULL
       AND invoice_month IS NOT NULL`,
  );
  for (const { account_id, invoice_month } of invoiceRows) {
    if (getCreditInvoicePaid(account_id, invoice_month)) continue;
    const account = getBankAccountById(account_id);
    if (!account || account.credit_enabled !== 1 || account.due_day == null) continue;
    const dueDate = getInvoiceDueDate(invoice_month, account.due_day);
    if (dueDate < minDateStr || dueDate > maxDateStr) continue;
    payloads.push({
      expenseId: `invoice-${account_id}-${invoice_month}`,
      dueDate,
      title: `Fatura ${account.name} ${invoice_month}`,
      status: 'pending',
      updatedAt: new Date().toISOString(),
    });
  }

  return payloads;
}

export function getMonthlyTotals({ month, year }: MonthYear): {
  income: number;
  expense: number;
  balance: number;
} {
  const db = getDb();
  const { startDate, endDate } = getMonthRange(month, year);

  const incomeRow = db.getFirstSync<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income' AND date >= ? AND date < ?",
    startDate,
    endDate,
  );

  const income = incomeRow?.total ?? 0;

  const nonCreditExpenseRow = db.getFirstSync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
     WHERE type = 'expense' AND date >= ? AND date < ?
       AND (payment_method IS NULL OR payment_method != 'credit')`,
    startDate,
    endDate,
  );

  const invoiceMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const creditExpenseRow = db.getFirstSync<{ total: number }>(
    `SELECT COALESCE(SUM(t.amount), 0) as total
     FROM transactions t
     WHERE t.type = 'expense' AND t.payment_method = 'credit' AND t.invoice_month = ?`,
    invoiceMonthStr,
  );

  const expense =
    (nonCreditExpenseRow?.total ?? 0) + (creditExpenseRow?.total ?? 0);
  return { income, expense, balance: income - expense };
}

export function getIncomeBySource({
  month,
  year,
}: MonthYear): { source: string; amount: number; color: string }[] {
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
    endDate,
  );

  const INCOME_COLORS = [
    '#50FA7B',
    '#8BE9FD',
    '#BD93F9',
    '#FF79C6',
    '#F1FA8C',
    '#FFB86C',
    '#6272A4',
    '#A4D4AE',
  ];

  return rows.map((r, i) => ({
    source: r.name || 'Outros',
    amount: r.amount,
    color: INCOME_COLORS[i % INCOME_COLORS.length],
  }));
}

export function getCategorySpendingByMonth({ month, year }: MonthYear): {
  categoryId: number;
  categoryName: string;
  spent: number;
  limit: number | null;
  color: string;
}[] {
  const db = getDb();
  const { startDate, endDate } = getMonthRange(month, year);
  const invoiceMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

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
     LEFT JOIN transactions t ON t.category_id = c.id AND t.type = 'expense'
       AND (
         (t.date >= ? AND t.date < ? AND (t.payment_method IS NULL OR t.payment_method != 'credit'))
         OR (t.payment_method = 'credit' AND t.invoice_month = ?)
       )
     GROUP BY c.id, c.name, c.spending_limit, c.color
     HAVING spent > 0`,
    startDate,
    endDate,
    invoiceMonthStr,
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
        end,
      );
      return row?.spent ?? 0;
    });
    return {
      ...cat,
      weekly,
    };
  });
}
