import React from "react";
import { View, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { TransactionForm } from "@/components/TransactionForm";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useMonth } from "@/context/MonthContext";
import { useToast } from "@/context/ToastContext";
import { createTransaction, getTransactionById } from "@/services/transactionService";
import { getAllCategories } from "@/services/categoryService";
import { getInitialDateForNewTransaction, getMonthYearFromDateStr, isDateInFutureMonth } from "@/utils/dateUtils";
import { pt } from "@/locales/pt";

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

  const handleSubmit = (data: {
    name: string;
    amount: number;
    date: string;
    categoryId: number | null;
    note: string | null;
  }) => {
    const planned = isDateInFutureMonth(data.date) ? 1 : 0;
    createTransaction({
      type: "expense",
      name: data.name,
      amount: data.amount,
      date: data.date,
      categoryId: data.categoryId,
      note: data.note,
      planned,
    });
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
        initialName={duplicateSource?.name}
        initialAmount={duplicateSource?.amount}
        initialDate={duplicateSource?.date ?? getInitialDateForNewTransaction(selectedMonth)}
        initialCategoryId={duplicateSource?.category_id}
        initialNote={duplicateSource?.note}
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
