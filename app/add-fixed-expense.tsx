import React from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { FixedExpenseForm } from "@/components/FixedExpenseForm";
import { useThemeColors } from "@/hooks/useThemeColors";
import { createFixedExpense } from "@/services/fixedExpenseService";
import { getAllCategories } from "@/services/categoryService";
import { getAllBankAccounts } from "@/services/bankAccountService";

export default function AddFixedExpenseScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const categories = getAllCategories();
  const accounts = getAllBankAccounts();

  const handleSubmit = (data: {
    name: string;
    amount: number;
    due_day: number;
    categoryId: number | null;
    note: string | null;
    accountId: number | null;
    paymentMethod: import("@/types").PaymentMethod | null;
  }) => {
    createFixedExpense({
      name: data.name,
      amount: data.amount,
      due_day: data.due_day,
      category_id: data.categoryId,
      note: data.note,
      account_id: data.accountId,
      payment_method: data.paymentMethod,
    });
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FixedExpenseForm categories={categories} accounts={accounts} onSubmit={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
