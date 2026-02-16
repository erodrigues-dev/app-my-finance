import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { getDb } from "@/database/init";
import { schemaVersion } from "@/database/schema";
import { getAllCategories } from "./categoryService";

interface BackupData {
  version: number;
  schemaVersion: number;
  backupDate: string;
  categories: { id: number; name: string; limit: number | null; color: string }[];
  transactions: {
    id: number;
    type: string;
    name: string;
    amount: number;
    date: string;
    category_id: number | null;
    note: string | null;
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
  }>("SELECT id, type, name, amount, date, category_id, note FROM transactions ORDER BY id");

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
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(path, {
      mimeType: "application/json",
      dialogTitle: "Salvar backup",
    });
  }
}

export function parseBackup(json: string): BackupData {
  return JSON.parse(json) as BackupData;
}

export async function restoreBackup(json: string): Promise<void> {
  const data = parseBackup(json);
  const db = getDb();

  db.execSync("DELETE FROM transactions");
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

  for (const tx of data.transactions) {
    const newCategoryId = tx.category_id ? categoryIdMap[tx.category_id] ?? null : null;
    db.runSync(
      "INSERT INTO transactions (type, name, amount, date, category_id, note) VALUES (?, ?, ?, ?, ?, ?)",
      tx.type,
      tx.name,
      tx.amount,
      tx.date,
      newCategoryId,
      tx.note
    );
  }
}
