import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { BankAccountForm } from "@/components/BankAccountForm";
import { useThemeColors } from "@/hooks/useThemeColors";
import {
  getBankAccountById,
  updateBankAccount,
  deleteBankAccount,
} from "@/services/bankAccountService";
import type { BankAccount } from "@/types";
import { pt } from "@/locales/pt";
import type { BankAccountFormData } from "@/components/BankAccountForm";

export default function EditBankAccountScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const [account, setAccount] = useState<BankAccount | null>(null);

  useEffect(() => {
    if (id) {
      const a = getBankAccountById(parseInt(id, 10));
      setAccount(a);
    }
  }, [id]);

  if (!id) return null;

  if (!account) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Conta não encontrada</Text>
      </View>
    );
  }

  const handleSubmit = (data: BankAccountFormData) => {
    updateBankAccount({ ...data, id: account.id });
    router.back();
  };

  const handleDelete = () => {
    Alert.alert(
      pt.deleteBankAccountConfirmTitle,
      pt.deleteBankAccountConfirmMessage,
      [
        { text: pt.cancel, style: "cancel" },
        {
          text: pt.delete,
          style: "destructive",
          onPress: () => {
            deleteBankAccount(account.id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <BankAccountForm
        initialName={account.name}
        initialCreditEnabled={account.credit_enabled}
        initialDebitEnabled={account.debit_enabled}
        initialPixEnabled={account.pix_enabled}
        initialIsDefault={account.is_default}
        initialClosingDay={account.closing_day}
        initialDueDay={account.due_day}
        initialDefaultPaymentMethod={account.default_payment_method ?? null}
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
          <Text
            style={[styles.deleteButtonText, { color: colors.expense ?? "#e74c3c" }]}
          >
            {pt.deleteBankAccount}
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
