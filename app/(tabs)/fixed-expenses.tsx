import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Modal,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useValuesVisibility } from "@/context/ValuesVisibilityContext";
import {
  getAllFixedExpenses,
  importFixedExpensesToMonth,
  type FixedExpenseWithCategory,
} from "@/services/fixedExpenseService";
import { pt } from "@/locales/pt";

const MONTH_NAMES = [
  pt.january,
  pt.february,
  pt.march,
  pt.april,
  pt.may,
  pt.june,
  pt.july,
  pt.august,
  pt.september,
  pt.october,
  pt.november,
  pt.december,
];

function getMonthsForImport(): { month: number; year: number }[] {
  const now = new Date();
  const result: { month: number; year: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    result.push({ month: d.getMonth(), year: d.getFullYear() });
  }
  return result;
}

function FixedExpenseRow({
  item,
  onPress,
  colors,
  formatCurrency,
}: {
  item: FixedExpenseWithCategory;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
  formatCurrency: (n: number) => string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.theme.card },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.icon, { backgroundColor: colors.expense + "20" }]}>
        <FontAwesome name="repeat" size={16} color={colors.expense} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.rowMeta, { color: colors.tabIconDefault }]}>
          Dia {item.due_day}
          {item.category_name ? ` · ${item.category_name}` : ""}
        </Text>
      </View>
      <Text style={[styles.rowAmount, { color: colors.expense }]}>
        {formatCurrency(item.amount)}
      </Text>
    </Pressable>
  );
}

export default function FixedExpensesScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { formatCurrency } = useValuesVisibility();
  const [list, setList] = useState<FixedExpenseWithCategory[]>(() =>
    getAllFixedExpenses()
  );
  const [importModalVisible, setImportModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setList(getAllFixedExpenses());
    }, [])
  );

  const months = useMemo(() => getMonthsForImport(), []);

  const totalAmount = useMemo(
    () => list.reduce((sum, item) => sum + item.amount, 0),
    [list]
  );

  const handleImportMonth = (month: number, year: number) => {
    setImportModalVisible(false);
    const { created, updated } = importFixedExpensesToMonth(month, year);
    const monthLabel = `${MONTH_NAMES[month]} ${year}`;
    if (created === 0 && updated === 0) {
      Alert.alert(pt.importFixedExpenses, `Nenhum gasto fixo para sincronizar em ${monthLabel}.`);
    } else {
      Alert.alert(
        pt.importFixedExpenses,
        `${created + updated} ${pt.fixedExpensesSyncFeedback} ${monthLabel}.${created > 0 ? ` ${created} criado(s).` : ""}${updated > 0 ? ` ${updated} atualizado(s).` : ""}`
      );
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.actions}>
        <Pressable
          onPress={() => router.push("/add-fixed-expense" as never)}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: colors.expenseButton },
            pressed && styles.pressed,
          ]}
        >
          <FontAwesome name="plus" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>{pt.addFixedExpense}</Text>
        </Pressable>
        <Pressable
          onPress={() => setImportModalVisible(true)}
          style={({ pressed }) => [
            styles.secondaryButton,
            { backgroundColor: colors.theme.card, borderColor: colors.tabIconDefault },
            pressed && styles.pressed,
          ]}
        >
          <FontAwesome name="download" size={18} color={colors.text} />
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
            {pt.importFixedExpenses}
          </Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {pt.fixedExpenses}
          </Text>
          {list.length > 0 && (
            <Text style={[styles.totalAmount, { color: colors.expense }]}>
              {pt.totalFixedExpenses}: {formatCurrency(totalAmount)}
            </Text>
          )}
        </View>
        {list.length === 0 ? (
          <Text style={[styles.empty, { color: colors.tabIconDefault }]}>
            {pt.noFixedExpensesList}
          </Text>
        ) : (
          list.map((item) => (
            <FixedExpenseRow
              key={item.id}
              item={item}
              onPress={() => router.push(`/edit-fixed-expense?id=${item.id}` as never)}
              colors={colors}
              formatCurrency={formatCurrency}
            />
          ))
        )}
      </View>

      <Modal
        visible={importModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImportModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setImportModalVisible(false)}
        >
          <View
            style={[styles.modalBox, { backgroundColor: colors.theme.card }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {pt.selectMonthToImport}
            </Text>
            <ScrollView
              style={styles.monthList}
              keyboardShouldPersistTaps="handled"
            >
              {months.map(({ month, year }) => (
                <Pressable
                  key={`${month}-${year}`}
                  onPress={() => handleImportMonth(month, year)}
                  style={({ pressed }) => [
                    styles.monthItem,
                    { backgroundColor: colors.background },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={{ color: colors.text }}>
                    {MONTH_NAMES[month]} {year}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => setImportModalVisible(false)}
              style={[styles.cancelButton, { borderColor: colors.tabIconDefault }]}
            >
              <Text style={{ color: colors.text }}>{pt.cancel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 32 },
  actions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  secondaryButtonText: { fontSize: 15, fontWeight: "700" },
  pressed: { opacity: 0.9 },
  section: { marginBottom: 24 },
  sectionHeader: { marginHorizontal: 16, marginBottom: 12 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  totalAmount: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 4,
  },
  empty: { marginHorizontal: 16, fontSize: 15 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowContent: { flex: 1 },
  rowName: { fontSize: 16, fontWeight: "600" },
  rowMeta: { fontSize: 13, marginTop: 2 },
  rowAmount: { fontSize: 16, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalBox: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  monthList: { maxHeight: 320 },
  monthItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  cancelButton: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
});
