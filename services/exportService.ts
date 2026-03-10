import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { getDb } from "@/database/init";
import { schemaVersion } from "@/database/schema";
import { getAllCategories } from "./categoryService";

interface BackupData {
  version: number;
  schemaVersion: number;
  backupDate: string;
  categories: { id: number; name: string; limit: number | null; color: string }[];
  fixed_expenses: {
    id: number;
    name: string;
    amount: number;
    due_day: number;
    category_id: number | null;
    note: string | null;
  }[];
  bank_accounts?: {
    id: number;
    name: string;
    credit_enabled: number;
    debit_enabled: number;
    pix_enabled: number;
    is_default: number;
    closing_day: number | null;
    due_day: number | null;
    default_payment_method?: string | null;
  }[];
  credit_invoice_payments?: {
    account_id: number;
    invoice_month: string;
    paid: number;
    paid_at: string | null;
  }[];
  transactions: {
    id: number;
    type: string;
    name: string;
    amount: number;
    date: string;
    category_id: number | null;
    note: string | null;
    fixed_expense_id?: number | null;
    installment_group_id?: number | null;
    paid?: number | null;
    planned?: number | null;
    account_id?: number | null;
    payment_method?: string | null;
    invoice_month?: string | null;
  }[];
}

export async function createBackup(): Promise<string> {
  const db = getDb();
  const categories = getAllCategories();

  const transactionRows = db.getAllSync<{
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
    `SELECT id, type, name, amount, date, category_id, note,
            fixed_expense_id, installment_group_id, paid, planned,
            account_id, payment_method, invoice_month
     FROM transactions
     ORDER BY id`
  );
  const fixedExpenseRows = db.getAllSync<{
    id: number;
    name: string;
    amount: number;
    due_day: number;
    category_id: number | null;
    note: string | null;
  }>("SELECT id, name, amount, due_day, category_id, note FROM fixed_expenses ORDER BY id");

  const bankAccountRows = db.getAllSync<{
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
    "SELECT id, name, credit_enabled, debit_enabled, pix_enabled, is_default, closing_day, due_day, default_payment_method FROM bank_accounts ORDER BY id"
  );

  const creditInvoiceRows = db.getAllSync<{
    account_id: number;
    invoice_month: string;
    paid: number;
    paid_at: string | null;
  }>("SELECT account_id, invoice_month, paid, paid_at FROM credit_invoice_payments ORDER BY account_id, invoice_month");

  const data: BackupData = {
    version: 1,
    schemaVersion,
    backupDate: new Date().toISOString(),
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      limit: c.limit,
      color: c.color,
    })),
    fixed_expenses: fixedExpenseRows,
    bank_accounts: bankAccountRows,
    credit_invoice_payments: creditInvoiceRows,
    transactions: transactionRows,
  };

  const json = JSON.stringify(data, null, 2);
  const filename = `my-finance-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const path = `${FileSystem.documentDirectory ?? ""}${filename}`;
  await FileSystem.writeAsStringAsync(path, json);
  return path;
}

export async function shareBackup(): Promise<void> {
  const path = await createBackup();
  const filename = path.split("/").pop() ?? `my-finance-backup-${new Date().toISOString().slice(0, 10)}.json`;

  // On Android, offer real local save using SAF so backup does not depend on share targets.
  if (Platform.OS === "android") {
    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (permissions.granted) {
      const json = await FileSystem.readAsStringAsync(path);
      const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        filename,
        "application/json"
      );
      await FileSystem.writeAsStringAsync(fileUri, json);
      return;
    }
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Sharing is not available on this device");
  }

  await Sharing.shareAsync(path, {
    mimeType: "application/json",
    UTI: "public.json",
    dialogTitle: "Salvar backup",
  });
}

export function parseBackup(json: string): BackupData {
  return JSON.parse(json) as BackupData;
}

export async function restoreBackup(json: string): Promise<void> {
  const data = parseBackup(json);
  const db = getDb();

  db.execSync("BEGIN TRANSACTION");
  try {
    db.execSync("DELETE FROM transactions");
    db.execSync("DELETE FROM credit_invoice_payments");
    db.execSync("DELETE FROM bank_accounts");
    db.execSync("DELETE FROM fixed_expenses");
    db.execSync("DELETE FROM categories");

    const categoryIdMap: Record<number, number> = {};
    for (const cat of data.categories) {
      const result = db.runSync(
        "INSERT INTO categories (name, spending_limit, color) VALUES (?, ?, ?)",
        cat.name,
        cat.limit,
        cat.color
      );
      categoryIdMap[cat.id] = result.lastInsertRowId;
    }

    const fixedExpenseIdMap: Record<number, number> = {};
    for (const fixedExpense of data.fixed_expenses ?? []) {
      const newCategoryId =
        fixedExpense.category_id != null
          ? categoryIdMap[fixedExpense.category_id] ?? null
          : null;
      const result = db.runSync(
        "INSERT INTO fixed_expenses (name, amount, due_day, category_id, note) VALUES (?, ?, ?, ?, ?)",
        fixedExpense.name,
        fixedExpense.amount,
        fixedExpense.due_day,
        newCategoryId,
        fixedExpense.note ?? null
      );
      fixedExpenseIdMap[fixedExpense.id] = result.lastInsertRowId;
    }

    const accountIdMap: Record<number, number> = {};
    for (const acc of data.bank_accounts ?? []) {
      const defaultPm = (acc as { default_payment_method?: string | null }).default_payment_method ?? null;
      const result = db.runSync(
        "INSERT INTO bank_accounts (name, credit_enabled, debit_enabled, pix_enabled, is_default, closing_day, due_day, default_payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        acc.name,
        acc.credit_enabled,
        acc.debit_enabled,
        acc.pix_enabled,
        acc.is_default,
        acc.closing_day,
        acc.due_day,
        defaultPm
      );
      accountIdMap[acc.id] = result.lastInsertRowId;
    }

    for (const row of data.credit_invoice_payments ?? []) {
      const newAccountId = accountIdMap[row.account_id];
      if (newAccountId == null) continue;
      db.runSync(
        "INSERT INTO credit_invoice_payments (account_id, invoice_month, paid, paid_at) VALUES (?, ?, ?, ?)",
        newAccountId,
        row.invoice_month,
        row.paid,
        row.paid_at ?? null
      );
    }

    for (const tx of data.transactions) {
      const newCategoryId =
        tx.category_id != null ? categoryIdMap[tx.category_id] ?? null : null;
      const newFixedExpenseId =
        tx.fixed_expense_id != null
          ? fixedExpenseIdMap[tx.fixed_expense_id] ?? null
          : null;
      const newAccountId =
        tx.account_id != null ? accountIdMap[tx.account_id] ?? null : null;
      db.runSync(
        "INSERT INTO transactions (type, name, amount, date, category_id, note, fixed_expense_id, installment_group_id, paid, planned, account_id, payment_method, invoice_month) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        tx.type,
        tx.name,
        tx.amount,
        tx.date,
        newCategoryId,
        tx.note ?? null,
        newFixedExpenseId,
        tx.installment_group_id ?? null,
        tx.paid ?? 0,
        tx.planned ?? 0,
        newAccountId,
        tx.payment_method ?? null,
        tx.invoice_month ?? null
      );
    }

    db.execSync("COMMIT");
  } catch (error) {
    db.execSync("ROLLBACK");
    throw error;
  }
}
