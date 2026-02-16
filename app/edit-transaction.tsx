import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { TransactionForm } from "@/components/TransactionForm";
import type { Transaction } from "@/types";
import { useThemeColors } from "@/hooks/useThemeColors";
import { getTransactionById, updateTransaction } from "@/services/transactionService";
import { getAllCategories } from "@/services/categoryService";

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
      data.note
    );
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
