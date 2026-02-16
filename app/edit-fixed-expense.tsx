import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { FixedExpenseForm } from "@/components/FixedExpenseForm";
import { useThemeColors } from "@/hooks/useThemeColors";
import { getFixedExpenseById, updateFixedExpense } from "@/services/fixedExpenseService";
import { getAllCategories } from "@/services/categoryService";
import type { FixedExpense } from "@/types";

export default function EditFixedExpenseScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const categories = getAllCategories();
  const [fixedExpense, setFixedExpense] = useState<FixedExpense | null>(null);

  useEffect(() => {
    if (id) {
      const fe = getFixedExpenseById(parseInt(id, 10));
      setFixedExpense(fe);
    }
  }, [id]);

  if (!id) return null;

  if (!fixedExpense) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Gasto fixo não encontrado</Text>
      </View>
    );
  }

  const handleSubmit = (data: {
    name: string;
    amount: number;
    due_day: number;
    categoryId: number | null;
    note: string | null;
  }) => {
    updateFixedExpense(
      fixedExpense.id,
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
      <FixedExpenseForm
        categories={categories}
        initialName={fixedExpense.name}
        initialAmount={fixedExpense.amount}
        initialDueDay={fixedExpense.due_day}
        initialCategoryId={fixedExpense.category_id}
        initialNote={fixedExpense.note}
        onSubmit={handleSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
