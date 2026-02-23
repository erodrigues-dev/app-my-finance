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
  }>(
    `SELECT id, type, name, amount, date, category_id, note,
            fixed_expense_id, installment_group_id, paid, planned
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

    for (const tx of data.transactions) {
      const newCategoryId =
        tx.category_id != null ? categoryIdMap[tx.category_id] ?? null : null;
      const newFixedExpenseId =
        tx.fixed_expense_id != null
          ? fixedExpenseIdMap[tx.fixed_expense_id] ?? null
          : null;
      db.runSync(
        "INSERT INTO transactions (type, name, amount, date, category_id, note, fixed_expense_id, installment_group_id, paid, planned) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        tx.type,
        tx.name,
        tx.amount,
        tx.date,
        newCategoryId,
        tx.note ?? null,
        newFixedExpenseId,
        tx.installment_group_id ?? null,
        tx.paid ?? 0,
        tx.planned ?? 0
      );
    }

    db.execSync("COMMIT");
  } catch (error) {
    db.execSync("ROLLBACK");
    throw error;
  }
}
