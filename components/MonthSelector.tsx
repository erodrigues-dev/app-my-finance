import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useMonth } from "@/context/MonthContext";
import { pt } from "@/locales/pt";

const MONTH_NAMES = [
  pt.january, pt.february, pt.march, pt.april, pt.may, pt.june,
  pt.july, pt.august, pt.september, pt.october, pt.november, pt.december,
];

export function MonthSelector() {
  const router = useRouter();
  const colors = useThemeColors();
  const { selectedMonth, goToPreviousMonth, goToNextMonth, canGoNext } = useMonth();

  return (
    <View style={[styles.container, { backgroundColor: colors.theme.card }]}>
      <Pressable
        onPress={goToPreviousMonth}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <FontAwesome name="chevron-left" size={20} color={colors.text} />
      </Pressable>
      <Pressable
        onPress={() => router.push("/month-picker")}
        style={({ pressed }) => [styles.monthPressable, pressed && styles.pressed]}
      >
        <Text style={[styles.monthText, { color: colors.text }]}>
          {MONTH_NAMES[selectedMonth.month]} {selectedMonth.year}
        </Text>
        <FontAwesome name="chevron-down" size={12} color={colors.tabIconDefault} />
      </Pressable>
      <Pressable
        onPress={goToNextMonth}
        disabled={!canGoNext}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.pressed,
          !canGoNext && styles.disabled,
        ]}
      >
        <FontAwesome
          name="chevron-right"
          size={20}
          color={canGoNext ? colors.text : colors.tabIconDefault}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  button: {
    padding: 8,
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.4,
  },
  monthPressable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  monthText: {
    fontSize: 18,
    fontWeight: "600",
  },
});
