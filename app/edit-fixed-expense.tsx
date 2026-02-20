import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { FixedExpenseForm } from "@/components/FixedExpenseForm";
import { useThemeColors } from "@/hooks/useThemeColors";
import { getFixedExpenseById, updateFixedExpense, deleteFixedExpense } from "@/services/fixedExpenseService";
import { getAllCategories } from "@/services/categoryService";
import { pt } from "@/locales/pt";
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
    updateFixedExpense({
      id: fixedExpense.id,
      name: data.name,
      amount: data.amount,
      due_day: data.due_day,
      category_id: data.categoryId,
      note: data.note,
    });
    router.back();
  };

  const handleDelete = () => {
    Alert.alert(
      pt.deleteFixedExpenseConfirmTitle,
      pt.deleteFixedExpenseConfirmMessage,
      [
        { text: pt.cancel, style: "cancel" },
        {
          text: pt.delete,
          style: "destructive",
          onPress: () => {
            deleteFixedExpense(fixedExpense.id);
            router.back();
          },
        },
      ]
    );
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
      <View style={styles.footer}>
        <Pressable
          onPress={handleDelete}
          style={({ pressed }) => [
            styles.deleteButton,
            { borderColor: colors.expense ?? "#e74c3c" },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.deleteButtonText, { color: colors.expense ?? "#e74c3c" }]}>
            {pt.deleteFixedExpense}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8,
  },
  deleteButton: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  deleteButtonText: { fontSize: 15, fontWeight: "700" },
  pressed: { opacity: 0.9 },
});
