import React from "react";
import { View, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { addMonths } from "date-fns";
import { TransactionForm } from "@/components/TransactionForm";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useMonth } from "@/context/MonthContext";
import { useToast } from "@/context/ToastContext";
import {
  createTransaction,
  getTransactionById,
  updateTransactionInstallmentGroup,
} from "@/services/transactionService";
import { getAllCategories } from "@/services/categoryService";
import {
  getDefaultBankAccount,
  getAllBankAccounts,
  getBankAccountById,
} from "@/services/bankAccountService";
import {
  formatDateStr,
  getInitialDateForNewTransaction,
  getMonthYearFromDateStr,
  isDateInFutureMonth,
  parseDateStr,
  getInvoiceMonth,
} from "@/utils/dateUtils";
import { pt } from "@/locales/pt";
import type { PaymentMethod } from "@/types";

export default function AddExpenseScreen() {
  const router = useRouter();
  const { duplicateId } = useLocalSearchParams<{ duplicateId?: string }>();
  const colors = useThemeColors();
  const { selectedMonth } = useMonth();
  const { showToast } = useToast();
  const categories = getAllCategories();

  const duplicateSource = duplicateId
    ? (() => {
        const tx = getTransactionById(parseInt(duplicateId, 10));
        return tx && tx.type === "expense" ? tx : null;
      })()
    : null;

  const accounts = getAllBankAccounts();
  const defaultAccount = getDefaultBankAccount();

  const getInvoiceMonthForCredit = (dateStr: string, accountId: number): string | null => {
    const acc = getBankAccountById(accountId);
    if (!acc || acc.credit_enabled !== 1 || acc.closing_day == null) return null;
    return getInvoiceMonth(dateStr, acc.closing_day);
  };

  const handleSubmit = (data: {
    name: string;
    amount: number;
    date: string;
    categoryId: number | null;
    note: string | null;
    installmentsCount?: number;
    accountId?: number | null;
    paymentMethod?: PaymentMethod | null;
  }) => {
    const installmentsCount = Math.max(1, data.installmentsCount ?? 1);
    const baseDate = parseDateStr(data.date);
    const accountId = data.accountId ?? null;
    const paymentMethod = data.paymentMethod ?? null;
    const invoiceMonth =
      paymentMethod === "credit" && accountId
        ? getInvoiceMonthForCredit(data.date, accountId)
        : null;

    if (installmentsCount === 1) {
      const planned = isDateInFutureMonth(data.date) ? 1 : 0;
      createTransaction({
        type: "expense",
        name: data.name,
        amount: data.amount,
        date: data.date,
        categoryId: data.categoryId,
        note: data.note,
        planned,
        accountId,
        paymentMethod,
        invoiceMonth,
      });
    } else {
      const firstName = `${data.name} (1/${installmentsCount})`;
      const firstId = createTransaction({
        type: "expense",
        name: firstName,
        amount: data.amount,
        date: data.date,
        categoryId: data.categoryId,
        note: data.note,
        planned: isDateInFutureMonth(data.date) ? 1 : 0,
        accountId,
        paymentMethod,
        invoiceMonth,
      });
      updateTransactionInstallmentGroup({
        id: firstId,
        installmentGroupId: firstId,
      });

      for (let i = 1; i < installmentsCount; i += 1) {
        const installmentDate = addMonths(baseDate, i);
        const installmentDateStr = formatDateStr(installmentDate);
        const installmentName = `${data.name} (${i + 1}/${installmentsCount})`;
        const planned = isDateInFutureMonth(installmentDateStr) ? 1 : 0;
        const installmentInvoiceMonth =
          paymentMethod === "credit" && accountId
            ? getInvoiceMonthForCredit(installmentDateStr, accountId)
            : null;
        createTransaction({
          type: "expense",
          name: installmentName,
          amount: data.amount,
          date: installmentDateStr,
          categoryId: data.categoryId,
          note: data.note,
          installmentGroupId: firstId,
          planned,
          accountId,
          paymentMethod,
          invoiceMonth: installmentInvoiceMonth,
        });
      }
    }
    const { month, year } = getMonthYearFromDateStr(data.date);
    if (year !== selectedMonth.year || month !== selectedMonth.month) {
      showToast({
        message: pt.transactionCreatedForMonth,
        viewMonth: { month, year },
      });
    }
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TransactionForm
        key={duplicateId ?? "new"}
        type="expense"
        categories={categories}
        accounts={accounts}
        initialAccountId={duplicateSource?.account_id ?? defaultAccount?.id ?? null}
        initialPaymentMethod={duplicateSource?.payment_method ?? null}
        initialName={duplicateSource?.name}
        initialAmount={duplicateSource?.amount}
        initialDate={duplicateSource?.date ?? getInitialDateForNewTransaction(selectedMonth)}
        initialCategoryId={duplicateSource?.category_id}
        initialNote={duplicateSource?.note}
        enableInstallments
        onSubmit={handleSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
