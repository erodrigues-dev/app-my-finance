import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { TransactionForm } from "@/components/TransactionForm";
import type { Transaction } from "@/types";
import { useThemeColors } from "@/hooks/useThemeColors";
import {
  getTransactionById,
  updateTransaction,
  deleteTransaction,
} from "@/services/transactionService";
import { getAllCategories } from "@/services/categoryService";
import { pt } from "@/locales/pt";

export default function EditTransactionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const categories = getAllCategories();
  const [transaction, setTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    if (id) {
      const tx = getTransactionById(parseInt(id, 10));
      setTransaction(tx);
    }
  }, [id]);

  if (!id) {
    return null;
  }

  if (!transaction) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Transação não encontrada</Text>
      </View>
    );
  }

  const handleSubmit = (data: {
    name: string;
    amount: number;
    date: string;
    categoryId: number | null;
    note: string | null;
  }) => {
    updateTransaction(
      transaction.id,
      transaction.type,
      data.name,
      data.amount,
      data.date,
      data.categoryId,
      data.note,
      transaction.fixed_expense_id ?? undefined,
      transaction.paid ?? 0
    );
    router.back();
  };

  const handleDelete = () => {
    Alert.alert(
      pt.deleteTransactionConfirmTitle,
      pt.deleteTransactionConfirmMessage,
      [
        { text: pt.cancel, style: "cancel" },
        {
          text: pt.delete,
          style: "destructive",
          onPress: () => {
            deleteTransaction(transaction.id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <TransactionForm
          type={transaction.type}
          categories={categories}
          initialName={transaction.name}
          initialAmount={transaction.amount}
          initialDate={transaction.date}
          initialCategoryId={transaction.category_id}
          initialNote={transaction.note}
          onSubmit={handleSubmit}
        />
        <Pressable
          onPress={handleDelete}
          style={({ pressed }) => [
            styles.deleteButton,
            { borderColor: colors.expense },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.deleteButtonText, { color: colors.expense }]}>
            {pt.deleteTransaction}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  deleteButton: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
  },
  deleteButtonText: { fontSize: 16, fontWeight: "700" },
  pressed: { opacity: 0.9 },
});
