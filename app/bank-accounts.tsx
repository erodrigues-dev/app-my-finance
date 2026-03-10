import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useThemeColors } from "@/hooks/useThemeColors";
import { getAllBankAccounts } from "@/services/bankAccountService";
import type { BankAccount } from "@/types";
import { pt } from "@/locales/pt";

export default function BankAccountsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [accounts, setAccounts] = useState<BankAccount[]>(getAllBankAccounts());

  useFocusEffect(
    useCallback(() => {
      setAccounts(getAllBankAccounts());
    }, [])
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.card, { backgroundColor: colors.theme.card }]}>
        {accounts.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
            {pt.noBankAccounts}
          </Text>
        ) : (
          accounts.map((account) => (
            <Pressable
              key={account.id}
              onPress={() => router.push(`/edit-bank-account?id=${account.id}`)}
              style={({ pressed }) => [
                styles.row,
                { borderBottomColor: colors.tabIconDefault + "30" },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.rowLeft}>
                <View style={styles.nameRow}>
                  {account.is_default === 1 && (
                    <FontAwesome
                      name="check-circle"
                      size={18}
                      color={colors.tint}
                      style={styles.defaultCheckLeft}
                    />
                  )}
                  <Text style={[styles.accountName, { color: colors.text }]} numberOfLines={1}>
                    {account.name}
                  </Text>
                </View>
                <View style={styles.badges}>
                  {account.credit_enabled === 1 && (
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: account.default_payment_method === "credit" ? colors.tint + "40" : colors.tint + "20",
                          borderWidth: account.default_payment_method === "credit" ? 1.5 : 0,
                          borderColor: account.default_payment_method === "credit" ? colors.tint : "transparent",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: account.default_payment_method === "credit" ? colors.tint : colors.text },
                          account.default_payment_method === "credit" && styles.badgeTextBold,
                        ]}
                      >
                        {pt.credit}
                      </Text>
                    </View>
                  )}
                  {account.debit_enabled === 1 && (
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: account.default_payment_method === "debit" ? colors.tint + "40" : colors.tint + "20",
                          borderWidth: account.default_payment_method === "debit" ? 1.5 : 0,
                          borderColor: account.default_payment_method === "debit" ? colors.tint : "transparent",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: account.default_payment_method === "debit" ? colors.tint : colors.text },
                          account.default_payment_method === "debit" && styles.badgeTextBold,
                        ]}
                      >
                        {pt.debit}
                      </Text>
                    </View>
                  )}
                  {account.pix_enabled === 1 && (
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: account.default_payment_method === "pix" ? colors.tint + "40" : colors.tint + "20",
                          borderWidth: account.default_payment_method === "pix" ? 1.5 : 0,
                          borderColor: account.default_payment_method === "pix" ? colors.tint : "transparent",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: account.default_payment_method === "pix" ? colors.tint : colors.text },
                          account.default_payment_method === "pix" && styles.badgeTextBold,
                        ]}
                      >
                        {pt.pix}
                      </Text>
                    </View>
                  )}
                </View>
                {account.credit_enabled === 1 && account.closing_day != null && account.due_day != null && (
                  <Text style={[styles.invoiceDays, { color: colors.tabIconDefault }]}>
                    {pt.invoiceFechShort}: {account.closing_day} · {pt.invoiceVencShort}: {account.due_day}
                  </Text>
                )}
              </View>
              <FontAwesome name="chevron-right" size={16} color={colors.tabIconDefault} />
            </Pressable>
          ))
        )}
      </View>

      <Pressable
        onPress={() => router.push("/add-bank-account")}
        style={({ pressed }) => [
          styles.addButton,
          { backgroundColor: colors.tint },
          pressed && styles.pressed,
        ]}
      >
        <FontAwesome name="plus" size={20} color="#fff" />
        <Text style={styles.addButtonText}>{pt.addBankAccount}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  card: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  rowLeft: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  accountName: { fontSize: 16, fontWeight: "600", flex: 1 },
  defaultCheckLeft: { marginRight: 0 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  badgeTextBold: { fontWeight: "700" },
  invoiceDays: { fontSize: 12, marginTop: 6 },
  emptyText: { padding: 24, textAlign: "center", fontSize: 15 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
    borderRadius: 12,
  },
  addButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  pressed: { opacity: 0.9 },
});
