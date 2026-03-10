export type TransactionType = "income" | "expense";

export type PaymentMethod = "credit" | "debit" | "pix";

export interface BankAccount {
  id: number;
  name: string;
  credit_enabled: number;
  debit_enabled: number;
  pix_enabled: number;
  is_default: number;
  closing_day: number | null;
  due_day: number | null;
  default_payment_method: PaymentMethod | null;
}

export interface Category {
  id: number;
  name: string;
  limit: number | null;
  color: string;
}

export interface FixedExpense {
  id: number;
  name: string;
  amount: number;
  due_day: number;
  category_id: number | null;
  note: string | null;
  account_id?: number | null;
  payment_method?: PaymentMethod | null;
}

export interface Transaction {
  id: number;
  type: TransactionType;
  name: string;
  amount: number;
  date: string;
  category_id: number | null;
  note: string | null;
  fixed_expense_id?: number | null;
  installment_group_id?: number | null;
  paid?: number;
  planned?: number;
  account_id?: number | null;
  payment_method?: PaymentMethod | null;
  invoice_month?: string | null;
}

export interface TransactionWithCategory extends Transaction {
  category_name?: string;
  category_color?: string;
  account_name?: string;
}
