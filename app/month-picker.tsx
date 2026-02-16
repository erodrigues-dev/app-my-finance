import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useMonth } from "@/context/MonthContext";
import { getMonthlyTotals } from "@/services/transactionService";
import { useValuesVisibility } from "@/context/ValuesVisibilityContext";
import { pt } from "@/locales/pt";

const MONTH_NAMES = [
  pt.january, pt.february, pt.march, pt.april, pt.may, pt.june,
  pt.july, pt.august, pt.september, pt.october, pt.november, pt.december,
];

function getMonthsInRange(offset: number): { month: number; year: number }[] {
  const now = new Date();
  const result: { month: number; year: number }[] = [];
  const startIdx = now.getMonth() + now.getFullYear() * 12 - 5 - offset * 6;
  for (let i = 0; i < 6; i++) {
    const idx = startIdx + i;
    const year = Math.floor(idx / 12);
    const month = ((idx % 12) + 12) % 12;
    result.push({ month, year });
  }
  return result;
}

const MAX_FUTURE_OFFSET = 4;

function MiniChart({
  income,
  expense,
  colors,
}: {
  income: number;
  expense: number;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const max = Math.max(income, expense, 1);
  return (
    <View style={miniChartStyles.container}>
      <View style={miniChartStyles.barRow}>
        <Text style={[miniChartStyles.barLabel, { color: colors.tabIconDefault }]}>E</Text>
        <View style={[miniChartStyles.barBg, { backgroundColor: colors.tabIconDefault + "20" }]}>
          <View
            style={[
              miniChartStyles.barFill,
              {
                width: `${(income / max) * 100}%`,
                backgroundColor: colors.income,
              },
            ]}
          />
        </View>
      </View>
      <View style={miniChartStyles.barRow}>
        <Text style={[miniChartStyles.barLabel, { color: colors.tabIconDefault }]}>S</Text>
        <View style={[miniChartStyles.barBg, { backgroundColor: colors.tabIconDefault + "20" }]}>
          <View
            style={[
              miniChartStyles.barFill,
              {
                width: `${(expense / max) * 100}%`,
                backgroundColor: colors.expense,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const miniChartStyles = StyleSheet.create({
  container: { gap: 4 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  barLabel: { fontSize: 10, fontWeight: "600", width: 12 },
  barBg: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },
});

export default function MonthPickerScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { formatCurrency } = useValuesVisibility();
  const { setSelectedMonth } = useMonth();
  const [offset, setOffset] = useState(0);

  const months = useMemo(() => getMonthsInRange(offset), [offset]);
  const monthData = useMemo(
    () =>
      months.map((m) => ({
        ...m,
        ...getMonthlyTotals(m.month, m.year),
      })),
    [months]
  );

  const canGoNext = offset > 0;
  const canGoFuture = offset > -MAX_FUTURE_OFFSET;
  const rangeLabel =
    offset === 0
      ? pt.monthPickerRecent
      : `${MONTH_NAMES[months[0].month]} ${months[0].year} - ${MONTH_NAMES[months[5].month]} ${months[5].year}`;

  const handleSelectMonth = (month: number, year: number) => {
    setSelectedMonth({ month, year });
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { borderBottomColor: colors.tabIconDefault + "30" }]}>
        <Pressable
          onPress={() => setOffset((o) => o + 1)}
          style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.6 }]}
        >
          <FontAwesome name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.rangeLabel, { color: colors.text }]} numberOfLines={1}>
          {rangeLabel}
        </Text>
        <Pressable
          onPress={() => canGoFuture && setOffset((o) => o - 1)}
          disabled={!canGoFuture}
          style={({ pressed }) => [
            styles.navButton,
            pressed && { opacity: 0.6 },
            !canGoFuture && { opacity: 0.3 },
          ]}
        >
          <FontAwesome
            name="chevron-right"
            size={22}
            color={colors.text}
          />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {monthData.map((data, i) => (
          <Pressable
            key={`${data.month}-${data.year}`}
            onPress={() => handleSelectMonth(data.month, data.year)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: colors.theme.card },
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {MONTH_NAMES[data.month]} {data.year}
            </Text>
            <View style={styles.cardBody}>
              <View style={styles.totals}>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: colors.tabIconDefault }]}>
                    {pt.totalIncome}
                  </Text>
                  <Text style={[styles.totalValue, { color: colors.income }]}>
                    {formatCurrency(data.income)}
                  </Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: colors.tabIconDefault }]}>
                    {pt.totalExpense}
                  </Text>
                  <Text style={[styles.totalValue, { color: colors.expense }]}>
                    {formatCurrency(data.expense)}
                  </Text>
                </View>
                <View style={[styles.totalRow, styles.balanceRow]}>
                  <Text style={[styles.totalLabel, { color: colors.tabIconDefault }]}>
                    {pt.balance}
                  </Text>
                  <Text
                    style={[
                      styles.totalValue,
                      { color: data.balance >= 0 ? colors.income : colors.expense },
                    ]}
                  >
                    {formatCurrency(data.balance)}
                  </Text>
                </View>
              </View>
              <MiniChart
                income={data.income}
                expense={data.expense}
                colors={colors}
              />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  navButton: { padding: 12 },
  rangeLabel: { fontSize: 14, fontWeight: "600", flex: 1, textAlign: "center" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 32 },
  card: {
    borderRadius: 12,
    padding: 16,
    overflow: "hidden",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 12,
  },
  cardBody: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  totals: { flex: 1 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  balanceRow: {
    marginTop: 4,
    marginBottom: 0,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.2)",
  },
  totalLabel: { fontSize: 12 },
  totalValue: { fontSize: 13, fontWeight: "600" },
});
