import React from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { FixedExpenseForm } from "@/components/FixedExpenseForm";
import { useThemeColors } from "@/hooks/useThemeColors";
import { createFixedExpense } from "@/services/fixedExpenseService";
import { getAllCategories } from "@/services/categoryService";

export default function AddFixedExpenseScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const categories = getAllCategories();

  const handleSubmit = (data: {
    name: string;
    amount: number;
    due_day: number;
    categoryId: number | null;
    note: string | null;
  }) => {
    createFixedExpense(
      data.name,
      data.amount,
      data.due_day,
      data.categoryId,
      data.note
    );
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FixedExpenseForm categories={categories} onSubmit={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
