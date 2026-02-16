import React from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { TransactionForm } from "@/components/TransactionForm";
import { useThemeColors } from "@/hooks/useThemeColors";
import { createTransaction } from "@/services/transactionService";
import { getAllCategories } from "@/services/categoryService";

export default function AddIncomeScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const categories = getAllCategories();

  const handleSubmit = (data: {
    name: string;
    amount: number;
    date: string;
    categoryId: number | null;
    note: string | null;
  }) => {
    createTransaction(
      "income",
      data.name,
      data.amount,
      data.date,
      null,
      data.note
    );
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TransactionForm
        type="income"
        categories={categories}
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
