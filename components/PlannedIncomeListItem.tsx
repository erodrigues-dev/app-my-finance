import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useValuesVisibility } from "@/context/ValuesVisibilityContext";
import { formatDateShort, getDueDateHighlightStatus } from "@/utils/dateUtils";
import type { TransactionWithCategory } from "@/types";

interface Props {
  transaction: TransactionWithCategory;
  onPress: () => void;
  onTogglePaid: (id: number, paid: number) => void;
}

export function PlannedIncomeListItem({
  transaction,
  onPress,
  onTogglePaid,
}: Props) {
  const colors = useThemeColors();
  const { formatCurrency } = useValuesVisibility();
  const paid = transaction.paid === 1;
  const dueDateStatus = getDueDateHighlightStatus(transaction.date, transaction.paid);
  const dueDateColor =
    dueDateStatus === "danger"
      ? colors.expense
      : dueDateStatus === "warning"
      ? colors.theme.warning
      : colors.tabIconDefault;

  const handleCheckboxPress = () => {
    onTogglePaid(transaction.id, paid ? 0 : 1);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.theme.card },
      ]}
    >
      <Pressable
        onPress={handleCheckboxPress}
        hitSlop={12}
        style={[
          styles.checkbox,
          {
            borderColor: colors.tabIconDefault,
            backgroundColor: paid ? colors.income + "40" : "transparent",
          },
        ]}
      >
        {paid && (
          <FontAwesome name="check" size={12} color={colors.income} />
        )}
      </Pressable>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.rowTouchable, pressed && styles.pressed]}
      >
        <View style={styles.content}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {transaction.name}
          </Text>
          <Text
            style={[styles.meta, { color: colors.tabIconDefault }]}
            numberOfLines={1}
          >
            <Text style={{ color: dueDateColor }}>
              {formatDateShort(transaction.date)}
            </Text>
            {transaction.category_name ? ` · ${transaction.category_name}` : ""}
          </Text>
        </View>
        <Text style={[styles.amount, { color: colors.income }]}>
          + {formatCurrency(transaction.amount)}
        </Text>
      </Pressable>
    </View>
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
  rowTouchable: { flex: 1, flexDirection: "row", alignItems: "center" },
  pressed: { opacity: 0.8 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flex: 1 },
  name: { fontSize: 16, fontWeight: "600" },
  meta: { fontSize: 13, marginTop: 2 },
  amount: { fontSize: 16, fontWeight: "700" },
});
