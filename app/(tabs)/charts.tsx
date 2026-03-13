import { getDate, isSameMonth } from "date-fns";
import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useMonth } from "@/context/MonthContext";
import { MonthSelector } from "@/components/MonthSelector";
import {
  getMonthlyTotals,
  getCategorySpendingByMonth,
} from "@/services/transactionService";
import { getAllCategories } from "@/services/categoryService";
import { PieChart } from "@/components/PieChart";
import { useValuesVisibility } from "@/context/ValuesVisibilityContext";
import { pt } from "@/locales/pt";

const EXPENSE_COLOR_COOL = "#64748B";
const EXPENSE_COLOR_NEUTRAL = "#94A3B8";
const EXPENSE_COLOR_YELLOW = "#FBBF24";
const EXPENSE_COLOR_ORANGE = "#F59E0B";

function getExpenseBarColor(expense: number, income: number, redColor: string): string {
  if (income <= 0) return redColor;
  const ratio = expense / income;
  if (ratio >= 1) return redColor;
  if (ratio >= 0.75) {
    const t = (ratio - 0.75) / 0.25;
    return lerpColor(EXPENSE_COLOR_ORANGE, redColor, t);
  }
  if (ratio >= 0.5) {
    const t = (ratio - 0.5) / 0.25;
    return lerpColor(EXPENSE_COLOR_YELLOW, EXPENSE_COLOR_ORANGE, t);
  }
  if (ratio >= 0.25) {
    const t = (ratio - 0.25) / 0.25;
    return lerpColor(EXPENSE_COLOR_NEUTRAL, EXPENSE_COLOR_YELLOW, t);
  }
  const t = ratio / 0.25;
  return lerpColor(EXPENSE_COLOR_COOL, EXPENSE_COLOR_NEUTRAL, t);
}

function lerpColor(hex1: string, hex2: string, t: number): string {
  const r1 = parseInt(hex1.slice(1, 3), 16);
  const g1 = parseInt(hex1.slice(3, 5), 16);
  const b1 = parseInt(hex1.slice(5, 7), 16);
  const r2 = parseInt(hex2.slice(1, 3), 16);
  const g2 = parseInt(hex2.slice(3, 5), 16);
  const b2 = parseInt(hex2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export default function ChartsScreen() {
  const colors = useThemeColors();
  const { formatCurrency, valuesVisible } = useValuesVisibility();
  const { selectedMonth } = useMonth();
  const [refreshKey, setRefreshKey] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      setRefreshKey((k) => k + 1);
    }, [])
  );

  const { income, expense } = useMemo(
    () => getMonthlyTotals(selectedMonth),
    [selectedMonth, refreshKey]
  );

  const categorySpending = useMemo(() => {
    const data = getCategorySpendingByMonth(selectedMonth);
    return [...data].sort((a, b) => {
      const aOver = a.limit != null && a.spent > (a.limit ?? 0);
      const bOver = b.limit != null && b.spent > (b.limit ?? 0);
      if (aOver !== bOver) return aOver ? -1 : 1;
      return b.spent - a.spent;
    });
  }, [selectedMonth, refreshKey]);

  const totalPlanned = useMemo(() => {
    const categories = getAllCategories();
    return categories.reduce((sum, c) => sum + (c.limit ?? 0), 0);
  }, [refreshKey]);

  const maxSpent = Math.max(
    ...categorySpending.map((c) => c.spent),
    expense,
    income,
    1
  );

  const currentWeekSeparator = useMemo(() => {
    const now = new Date();
    const selected = new Date(selectedMonth.year, selectedMonth.month, 1);
    if (!isSameMonth(selected, now)) {
      return null;
    }
    const day = getDate(now);
    if (day <= 7) return 25;
    if (day <= 14) return 50;
    return 75;
  }, [selectedMonth]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <MonthSelector />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {pt.incomeVsExpense}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.theme.card }]}>
          <View style={styles.totalsRow}>
            <Text style={[styles.totalsLabel, { color: colors.text }]}>
              {pt.totalIncome}
            </Text>
            <View style={styles.totalsBarContainer}>
              <View
                style={[
                  styles.totalsBar,
                  {
                    width: `${Math.min(100, (income / maxSpent) * 100)}%`,
                    backgroundColor: colors.income,
                  },
                ]}
              />
            </View>
            <Text style={[styles.totalsValue, { color: colors.income }]}>
              {formatCurrency(income)}
            </Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={[styles.totalsLabel, { color: colors.text }]}>
              {pt.totalExpense}
            </Text>
            <View style={styles.totalsBarContainer}>
              <View
                style={[
                  styles.totalsBar,
                  {
                    width: `${Math.min(100, totalPlanned > 0 ? (expense / totalPlanned) * 100 : (expense / maxSpent) * 100)}%`,
                    backgroundColor: getExpenseBarColor(expense, income, colors.expense),
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.totalsValue,
                { color: getExpenseBarColor(expense, income, colors.expense) },
              ]}
            >
              {totalPlanned > 0
                ? `${formatCurrency(expense)} / ${formatCurrency(totalPlanned)}`
                : formatCurrency(expense)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {pt.spendingByCategory}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.theme.card }]}>
          {categorySpending.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
              Nenhum gasto por categoria este mês
            </Text>
          ) : (
            categorySpending.map((c) => {
              const limit = c.limit ?? c.spent;
              const maxVal = Math.max(c.spent, limit, 1);
              const isOver = c.limit != null && c.spent > (c.limit ?? 0);
              const excess = isOver ? c.spent - (c.limit ?? 0) : 0;
              const excessPercent =
                isOver && c.limit != null && c.limit > 0
                  ? Math.round((excess / c.limit) * 100)
                  : 0;
              const fillPct = (c.spent / maxVal) * 100;
              const barColor = isOver ? colors.expense : c.color;

              return (
                <View key={c.categoryId} style={styles.categoryRow}>
                  <Text
                    style={[
                      styles.categoryName,
                      { color: colors.text },
                      isOver && { color: colors.expense },
                    ]}
                    numberOfLines={1}
                  >
                    {c.categoryName}
                  </Text>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.min(100, fillPct)}%`,
                          backgroundColor: barColor,
                        },
                      ]}
                    />
                    {[25, 50, 75].map((pct) => (
                      <View
                        key={pct}
                        style={[
                          styles.barSeparator,
                          currentWeekSeparator === pct && styles.barSeparatorCurrent,
                          {
                            left: `${pct}%`,
                            backgroundColor: currentWeekSeparator === pct ? colors.tint : colors.text + "40",
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <View style={styles.barValueContainer}>
                    <Text
                      style={[
                        styles.barValueSmall,
                        {
                          color: isOver ? colors.expense : colors.text,
                        },
                      ]}
                    >
                      {formatCurrency(c.spent)}
                      {c.limit != null && ` / ${formatCurrency(c.limit)}`}
                    </Text>
                    {isOver && (
                      <Text
                        style={[
                          styles.excessText,
                          { color: colors.expense },
                        ]}
                      >
                        Excedente: +{formatCurrency(excess)}
                        {valuesVisible && ` (${excessPercent}%)`}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {pt.categoryPieChart}
        </Text>
        <Text style={[styles.totalIncomeLabel, { color: colors.income }]}>
          {pt.totalIncome}: {formatCurrency(income)}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.theme.card }]}>
          {(() => {
            const livre = Math.max(0, income - expense);

            const pieData = [
              ...categorySpending.map((c) => ({
                label: c.categoryName,
                value: c.spent,
                color: c.color,
              })),
              ...(livre > 0
                ? [{ label: pt.pieChartLivre, value: livre, color: "#B8B8B8" }]
                : []),
            ];

            if (pieData.length === 0) {
              return (
                <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
                  Nenhuma movimentação este mês
                </Text>
              );
            }

            return (
              <View style={styles.pieSection}>
                <PieChart data={pieData} size={200} />
                <View style={styles.pieLegend}>
                  {categorySpending.map((c) => (
                    <View key={c.categoryId} style={styles.pieLegendItem}>
                      <View
                        style={[
                          styles.pieLegendDot,
                          { backgroundColor: c.color },
                        ]}
                      />
                      <Text
                        style={[styles.pieLegendLabel, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {c.categoryName}
                      </Text>
                      <Text
                        style={[styles.pieLegendValue, { color: colors.text }]}
                      >
                        {formatCurrency(c.spent)}
                      </Text>
                    </View>
                  ))}
                  {livre > 0 && (
                    <View style={styles.pieLegendItem}>
                      <View
                        style={[
                          styles.pieLegendDot,
                          { backgroundColor: "#B8B8B8" },
                        ]}
                      />
                      <Text
                        style={[styles.pieLegendLabel, { color: colors.text }]}
                      >
                        {pt.pieChartLivre}
                      </Text>
                      <Text
                        style={[
                          styles.pieLegendValue,
                          { color: colors.income },
                        ]}
                      >
                        {formatCurrency(livre)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })()}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginHorizontal: 16,
    marginBottom: 4,
  },
  card: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
  },
  totalsRow: {
    marginBottom: 20,
  },
  totalsLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  totalsBarContainer: {
    width: "100%",
    height: 28,
    backgroundColor: "rgba(128,128,128,0.2)",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 6,
    position: "relative",
  },
  totalsBarSeparator: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
  },
  totalsBar: {
    height: "100%",
    borderRadius: 6,
  },
  totalsValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  barContainer: {
    width: "100%",
    height: 28,
    backgroundColor: "rgba(128,128,128,0.2)",
    borderRadius: 6,
    overflow: "hidden",
    position: "relative",
    marginBottom: 6,
  },
  bar: {
    height: "100%",
  },
  barSmall: {
    height: 28,
  },
  barSegmentLeft: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  barSegmentRight: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  barSegmentMiddle: {
    borderRadius: 0,
  },
  barSegmentGap: {
    borderRightWidth: 1,
  },
  barSegmentSingle: {
    borderRadius: 6,
  },
  barFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  barSeparator: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
  },
  barSeparatorCurrent: {
    width: 3,
    marginLeft: -1.5,
  },
  barStack: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
    flexDirection: "row",
  },
  barValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  excessText: {
    fontSize: 11,
    fontWeight: "600",
  },
  barValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  barLabel: {
    width: 80,
    fontSize: 14,
  },
  limitMarker: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
  },
  categoryRow: {
    marginBottom: 20,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  barValueSmall: {
    fontSize: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  totalIncomeLabel: {
    fontSize: 16,
    fontWeight: "700",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  pieSection: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
  },
  pieLegend: {
    flex: 1,
    minWidth: 140,
    marginTop: 8,
  },
  pieLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  pieLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  pieLegendLabel: {
    flex: 1,
    fontSize: 13,
  },
  pieLegendValue: {
    fontSize: 13,
    fontWeight: "600",
  },
});
