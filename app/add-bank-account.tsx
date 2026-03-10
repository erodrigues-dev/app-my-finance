import React from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { BankAccountForm } from "@/components/BankAccountForm";
import { useThemeColors } from "@/hooks/useThemeColors";
import { createBankAccount } from "@/services/bankAccountService";
import type { BankAccountFormData } from "@/components/BankAccountForm";

export default function AddBankAccountScreen() {
  const router = useRouter();
  const colors = useThemeColors();

  const handleSubmit = (data: BankAccountFormData) => {
    createBankAccount(data);
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <BankAccountForm onSubmit={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
