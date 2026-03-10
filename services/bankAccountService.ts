import { getDb } from "@/database/init";
import type { BankAccount } from "@/types";
import { getInvoiceMonth } from "@/utils/dateUtils";
import { format, startOfMonth } from "date-fns";

export function getAllBankAccounts(): BankAccount[] {
  const db = getDb();
  const rows = db.getAllSync<{
    id: number;
    name: string;
    credit_enabled: number;
    debit_enabled: number;
    pix_enabled: number;
    is_default: number;
    closing_day: number | null;
    due_day: number | null;
    default_payment_method: string | null;
  }>(
    "SELECT id, name, credit_enabled, debit_enabled, pix_enabled, is_default, closing_day, due_day, default_payment_method FROM bank_accounts ORDER BY name ASC"
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    credit_enabled: r.credit_enabled,
    debit_enabled: r.debit_enabled,
    pix_enabled: r.pix_enabled,
    is_default: r.is_default,
    closing_day: r.closing_day,
    due_day: r.due_day,
    default_payment_method: (r.default_payment_method as BankAccount["default_payment_method"]) ?? null,
  }));
}

export function getBankAccountById(id: number): BankAccount | null {
  const db = getDb();
  const row = db.getFirstSync<{
    id: number;
    name: string;
    credit_enabled: number;
    debit_enabled: number;
    pix_enabled: number;
    is_default: number;
    closing_day: number | null;
    due_day: number | null;
    default_payment_method: string | null;
  }>(
    "SELECT id, name, credit_enabled, debit_enabled, pix_enabled, is_default, closing_day, due_day, default_payment_method FROM bank_accounts WHERE id = ?",
    id
  );
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    credit_enabled: row.credit_enabled,
    debit_enabled: row.debit_enabled,
    pix_enabled: row.pix_enabled,
    is_default: row.is_default,
    closing_day: row.closing_day,
    due_day: row.due_day,
    default_payment_method: (row.default_payment_method as BankAccount["default_payment_method"]) ?? null,
  };
}

export function getDefaultBankAccount(): BankAccount | null {
  const db = getDb();
  const row = db.getFirstSync<{
    id: number;
    name: string;
    credit_enabled: number;
    debit_enabled: number;
    pix_enabled: number;
    is_default: number;
    closing_day: number | null;
    due_day: number | null;
    default_payment_method: string | null;
  }>(
    "SELECT id, name, credit_enabled, debit_enabled, pix_enabled, is_default, closing_day, due_day, default_payment_method FROM bank_accounts WHERE is_default = 1 LIMIT 1"
  );
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    credit_enabled: row.credit_enabled,
    debit_enabled: row.debit_enabled,
    pix_enabled: row.pix_enabled,
    is_default: row.is_default,
    closing_day: row.closing_day,
    due_day: row.due_day,
    default_payment_method: (row.default_payment_method as BankAccount["default_payment_method"]) ?? null,
  };
}

export type CreateBankAccountParams = {
  name: string;
  credit_enabled: number;
  debit_enabled: number;
  pix_enabled: number;
  is_default: number;
  closing_day: number | null;
  due_day: number | null;
  default_payment_method: "credit" | "debit" | "pix" | null;
};

export function createBankAccount(params: CreateBankAccountParams): number {
  const db = getDb();
  if (params.is_default === 1) {
    db.runSync("UPDATE bank_accounts SET is_default = 0");
  }
  const result = db.runSync(
    "INSERT INTO bank_accounts (name, credit_enabled, debit_enabled, pix_enabled, is_default, closing_day, due_day, default_payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    params.name,
    params.credit_enabled,
    params.debit_enabled,
    params.pix_enabled,
    params.is_default,
    params.closing_day,
    params.due_day,
    params.default_payment_method
  );
  return result.lastInsertRowId;
}

export type UpdateBankAccountParams = CreateBankAccountParams & { id: number };

export function updateBankAccount(params: UpdateBankAccountParams): void {
  const db = getDb();
  if (params.is_default === 1) {
    db.runSync("UPDATE bank_accounts SET is_default = 0 WHERE id != ?", params.id);
  }
  db.runSync(
    "UPDATE bank_accounts SET name = ?, credit_enabled = ?, debit_enabled = ?, pix_enabled = ?, is_default = ?, closing_day = ?, due_day = ?, default_payment_method = ? WHERE id = ?",
    params.name,
    params.credit_enabled,
    params.debit_enabled,
    params.pix_enabled,
    params.is_default,
    params.closing_day,
    params.due_day,
    params.default_payment_method,
    params.id
  );

  if (params.credit_enabled === 1 && params.closing_day != null) {
    recalculateCreditInvoiceMonthsFromCurrentMonth(params.id, params.closing_day);
  }
}

/**
 * Recalcula invoice_month das transações de crédito desta conta a partir do mês corrente,
 * usando o novo dia de fechamento. Atualiza faturas corrente e futuras.
 */
function recalculateCreditInvoiceMonthsFromCurrentMonth(
  accountId: number,
  closingDay: number
): void {
  const db = getDb();
  const currentMonthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const rows = db.getAllSync<{ id: number; date: string }>(
    "SELECT id, date FROM transactions WHERE account_id = ? AND payment_method = 'credit' AND date >= ? ORDER BY date ASC",
    accountId,
    currentMonthStart
  );
  for (const row of rows) {
    const newInvoiceMonth = getInvoiceMonth(row.date, closingDay);
    db.runSync("UPDATE transactions SET invoice_month = ? WHERE id = ?", newInvoiceMonth, row.id);
  }
}

export function deleteBankAccount(id: number): void {
  const db = getDb();
  db.runSync("DELETE FROM credit_invoice_payments WHERE account_id = ?", id);
  db.runSync("UPDATE transactions SET account_id = NULL, payment_method = NULL, invoice_month = NULL WHERE account_id = ?", id);
  db.runSync("DELETE FROM bank_accounts WHERE id = ?", id);
}

export function getCreditInvoicePaid(accountId: number, invoiceMonth: string): boolean {
  const db = getDb();
  const row = db.getFirstSync<{ paid: number }>(
    "SELECT paid FROM credit_invoice_payments WHERE account_id = ? AND invoice_month = ?",
    accountId,
    invoiceMonth
  );
  return row?.paid === 1;
}

export function setCreditInvoicePaid(
  accountId: number,
  invoiceMonth: string,
  paid: number
): void {
  const db = getDb();
  const existing = db.getFirstSync<{ paid: number }>(
    "SELECT paid FROM credit_invoice_payments WHERE account_id = ? AND invoice_month = ?",
    accountId,
    invoiceMonth
  );
  if (existing != null) {
    db.runSync(
      "UPDATE credit_invoice_payments SET paid = ?, paid_at = ? WHERE account_id = ? AND invoice_month = ?",
      paid,
      paid === 1 ? new Date().toISOString() : null,
      accountId,
      invoiceMonth
    );
  } else {
    db.runSync(
      "INSERT INTO credit_invoice_payments (account_id, invoice_month, paid, paid_at) VALUES (?, ?, ?, ?)",
      accountId,
      invoiceMonth,
      paid,
      paid === 1 ? new Date().toISOString() : null
    );
  }
}
