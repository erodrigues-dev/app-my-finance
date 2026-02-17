import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useMonth } from "@/context/MonthContext";
import { MonthSelector } from "@/components/MonthSelector";
import { TransactionListItem } from "@/components/TransactionListItem";
import { pt } from "@/locales/pt";
import { useValuesVisibility } from "@/context/ValuesVisibilityContext";
import {
  getTransactionsByMonth,
  getMonthlyTotals,
  getCategorySpendingByMonth,
  updateTransactionPaid,
} from "@/services/transactionService";
import { FixedExpenseListItem } from "@/components/FixedExpenseListItem";

export default function HomeScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { formatCurrency } = useValuesVisibility();
  const { selectedMonth } = useMonth();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [transactionsExpanded, setTransactionsExpanded] = useState(true);
  const [fixedExpensesExpanded, setFixedExpensesExpanded] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      setRefreshKey((k) => k + 1);
    }, [])
  );

  const { income, expense, balance } = useMemo(
    () => getMonthlyTotals(selectedMonth.month, selectedMonth.year),
    [selectedMonth, refreshKey]
  );

  const allTransactions = useMemo(
    () => getTransactionsByMonth(selectedMonth.month, selectedMonth.year),
    [selectedMonth, refreshKey]
  );

  const regularTransactions = useMemo(() => {
    const list = allTransactions.filter((t) => t.fixed_expense_id == null);
    return [...list].sort((a, b) => {
      const dateCmp = (b.date || "").localeCompare(a.date || "");
      if (dateCmp !== 0) return dateCmp;
      return (a.category_name || "").localeCompare(b.category_name || "");
    });
  }, [allTransactions]);

  const fixedExpenseTransactions = useMemo(() => {
    const list = allTransactions.filter((t) => t.fixed_expense_id != null);
    return [...list].sort((a, b) => {
      const paidCmp = (a.paid ?? 0) - (b.paid ?? 0);
      if (paidCmp !== 0) return paidCmp;
      const dateCmp = (a.date || "").localeCompare(b.date || "");
      if (dateCmp !== 0) return dateCmp;
      return (a.category_name || "").localeCompare(b.category_name || "");
    });
  }, [allTransactions]);

  const handleTogglePaid = (id: number, paid: number) => {
    updateTransactionPaid(id, paid);
    setRefreshKey((k) => k + 1);
  };

  const categoriesOverLimit = useMemo(() => {
    const spending = getCategorySpendingByMonth(
      selectedMonth.month,
      selectedMonth.year
    );
    return spending.filter((c) => c.limit != null && c.spent > (c.limit ?? 0));
  }, [selectedMonth, refreshKey]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <MonthSelector />

      <View style={styles.cardsRow}>
        <View style={[styles.card, { backgroundColor: colors.theme.card }]}>
          <Text style={[styles.cardLabel, { color: colors.tabIconDefault }]}>
            {pt.totalIncome}
          </Text>
          <Text style={[styles.cardValue, { color: colors.income }]}>
            {formatCurrency(income)}
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.theme.card }]}>
          <Text style={[styles.cardLabel, { color: colors.tabIconDefault }]}>
            {pt.totalExpense}
          </Text>
          <Text style={[styles.cardValue, { color: colors.expense }]}>
            {formatCurrency(expense)}
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.theme.card }]}>
          <Text style={[styles.cardLabel, { color: colors.tabIconDefault }]}>
            {pt.balance}
          </Text>
          <Text
            style={[
              styles.cardValue,
              { color: balance >= 0 ? colors.income : colors.expense },
            ]}
          >
            {formatCurrency(balance)}
          </Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <Pressable
          onPress={() => router.push("/add-income")}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: colors.incomeButton },
            pressed && styles.pressed,
          ]}
        >
          <FontAwesome name="arrow-down" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>{pt.addIncome}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/add-expense")}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: colors.expenseButton },
            pressed && styles.pressed,
          ]}
        >
          <FontAwesome name="arrow-up" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>{pt.addExpense}</Text>
        </Pressable>
      </View>

      {categoriesOverLimit.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.sectionTitlePadded, { color: colors.text }]}>
            {pt.categoriesOverLimit}
          </Text>
          {categoriesOverLimit.map((c) => (
            <View
              key={c.categoryId}
              style={[
                styles.overLimitCard,
                { backgroundColor: colors.theme.warning + "20" },
              ]}
            >
              <Text style={[styles.overLimitName, { color: colors.text }]}>
                {c.categoryName}
              </Text>
              <Text style={[styles.overLimitAmount, { color: colors.theme.warning }]}>
                {formatCurrency(c.spent)} / {formatCurrency(c.limit ?? 0)}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Pressable
          onPress={() => setTransactionsExpanded((e) => !e)}
          style={({ pressed }) => [
            styles.sectionHeader,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {pt.transactions}
          </Text>
          <FontAwesome
            name={transactionsExpanded ? "chevron-down" : "chevron-right"}
            size={18}
            color={colors.tabIconDefault}
          />
        </Pressable>
        {transactionsExpanded && (
          <>
            {regularTransactions.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
                {pt.noTransactions}
              </Text>
            ) : (
              regularTransactions.map((tx) => (
                <TransactionListItem
                  key={tx.id}
                  transaction={tx}
                  onPress={() => router.push(`/edit-transaction?id=${tx.id}`)}
                />
              ))
            )}
          </>
        )}
      </View>

      <View style={styles.section}>
        <Pressable
          onPress={() => setFixedExpensesExpanded((e) => !e)}
          style={({ pressed }) => [
            styles.sectionHeader,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {pt.fixedExpenses}
          </Text>
          <FontAwesome
            name={fixedExpensesExpanded ? "chevron-down" : "chevron-right"}
            size={18}
            color={colors.tabIconDefault}
          />
        </Pressable>
        {fixedExpensesExpanded && (
          <>
            {fixedExpenseTransactions.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
                {pt.noFixedExpenses}
              </Text>
            ) : (
              fixedExpenseTransactions.map((tx) => (
                <FixedExpenseListItem
                  key={tx.id}
                  transaction={tx}
                  onPress={() => router.push(`/edit-transaction?id=${tx.id}`)}
                  onTogglePaid={handleTogglePaid}
                />
              ))
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cardsRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  sectionTitlePadded: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  overLimitCard: {
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  overLimitName: {
    fontSize: 15,
    fontWeight: "600",
  },
  overLimitAmount: {
    fontSize: 14,
    fontWeight: "700",
  },
  actionButtons: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.9,
  },
  emptyText: {
    marginHorizontal: 16,
    fontSize: 15,
  },
});
