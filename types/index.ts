export type TransactionType = "income" | "expense";

export interface Category {
  id: number;
  name: string;
  limit: number | null;
  color: string;
}

export interface Transaction {
  id: number;
  type: TransactionType;
  name: string;
  amount: number;
  date: string;
  category_id: number | null;
  note: string | null;
}

export interface TransactionWithCategory extends Transaction {
  category_name?: string;
  category_color?: string;
}
