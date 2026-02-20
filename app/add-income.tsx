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
  formatDateStr,
  getInitialDateForNewTransaction,
  getMonthYearFromDateStr,
  isDateInFutureMonth,
  parseDateStr,
} from "@/utils/dateUtils";
import { pt } from "@/locales/pt";

export default function AddIncomeScreen() {
  const router = useRouter();
  const { duplicateId } = useLocalSearchParams<{ duplicateId?: string }>();
  const colors = useThemeColors();
  const { selectedMonth } = useMonth();
  const { showToast } = useToast();
  const categories = getAllCategories();

  const duplicateSource = duplicateId
    ? (() => {
        const tx = getTransactionById(parseInt(duplicateId, 10));
        return tx && tx.type === "income" ? tx : null;
      })()
    : null;

  const handleSubmit = (data: {
    name: string;
    amount: number;
    date: string;
    categoryId: number | null;
    note: string | null;
    installmentsCount?: number;
  }) => {
    const installmentsCount = Math.max(1, data.installmentsCount ?? 1);
    const baseDate = parseDateStr(data.date);
    if (installmentsCount === 1) {
      const planned = isDateInFutureMonth(data.date) ? 1 : 0;
      createTransaction({
        type: "income",
        name: data.name,
        amount: data.amount,
        date: data.date,
        categoryId: null,
        note: data.note,
        planned,
      });
    } else {
      const firstName = `${data.name} (1/${installmentsCount})`;
      const firstId = createTransaction({
        type: "income",
        name: firstName,
        amount: data.amount,
        date: data.date,
        categoryId: null,
        note: data.note,
        planned: isDateInFutureMonth(data.date) ? 1 : 0,
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
        createTransaction({
          type: "income",
          name: installmentName,
          amount: data.amount,
          date: installmentDateStr,
          categoryId: null,
          note: data.note,
          installmentGroupId: firstId,
          planned,
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
        type="income"
        categories={categories}
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
