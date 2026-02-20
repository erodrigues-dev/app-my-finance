import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useValuesVisibility } from "@/context/ValuesVisibilityContext";
import { formatDateShort } from "@/utils/dateUtils";
import type { TransactionWithCategory } from "@/types";

interface Props {
  transaction: TransactionWithCategory;
  onPress: () => void;
  onDelete?: () => void;
}

export function TransactionListItem({ transaction, onPress }: Props) {
  const colors = useThemeColors();
  const { formatCurrency } = useValuesVisibility();
  const isIncome = transaction.type === "income";
  const amountColor = isIncome ? colors.income : colors.expense;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: colors.theme.card },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.icon, { backgroundColor: amountColor + "20" }]}>
        <FontAwesome
          name={isIncome ? "arrow-down" : "arrow-up"}
          size={16}
          color={amountColor}
        />
      </View>
      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {transaction.name}
        </Text>
        <Text
          style={[styles.category, { color: colors.tabIconDefault }]}
          numberOfLines={1}
        >
          {formatDateShort(transaction.date)}
          {transaction.category_name ? ` · ${transaction.category_name}` : ""}
        </Text>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>
        {isIncome ? "+" : "-"} {formatCurrency(transaction.amount)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
  },
  pressed: {
    opacity: 0.8,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
  category: {
    fontSize: 13,
    marginTop: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: "700",
  },
});
