import {
  openDatabaseSync,
  type SQLiteDatabase,
} from "expo-sqlite";
import { migrations } from "./schema";

let db: SQLiteDatabase | null = null;

export function initDatabase() {
  if (!db) {
    db = openDatabaseSync("myfinance.db");
    for (const sql of migrations) {
      db.execSync(sql);
    }
  }
  return db;
}

export function getDb(): SQLiteDatabase {
  if (!db) {
    initDatabase();
  }
  return db!;
}
