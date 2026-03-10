import { addMonths, getMonth, getYear, startOfMonth } from "date-fns";
import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Modal,
  Animated,
} from "react-native";
import { fabStyles, useFabContainerStyle } from "@/components/FabLayout";
import { useRouter, useFocusEffect } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFabPosition } from "@/context/FabPositionContext";
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
  const start = startOfMonth(new Date());
  const result: { month: number; year: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = addMonths(start, i);
    result.push({ month: getMonth(d), year: getYear(d) });
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
  const fabContainerStyle = useFabContainerStyle();
  const { fabPosition } = useFabPosition();
  const { formatCurrency } = useValuesVisibility();
  const [list, setList] = useState<FixedExpenseWithCategory[]>(() =>
    getAllFixedExpenses()
  );
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [fabOpen, setFabOpen] = useState(false);
  const fabAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fabAnim, {
      toValue: fabOpen ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [fabOpen, fabAnim]);

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

  const groups = useMemo(() => {
    const map = new Map<
      string,
      {
        title: string;
        subtotal: number;
        items: FixedExpenseWithCategory[];
      }
    >();

    for (const item of list) {
      const paymentLabel =
        item.payment_method === "credit"
          ? pt.credit
          : item.payment_method === "debit"
            ? pt.debit
            : item.payment_method === "pix"
              ? pt.pix
              : pt.noPaymentMethodGroup;

      const accountName =
        item.account_name ??
        (item.account_id != null ? pt.bankAccount : pt.noBankAccountDefined);

      const key = `${item.account_id ?? "none"}-${item.payment_method ?? "none"}`;
      const isNoAccountNoPayment =
        item.account_id == null && item.payment_method == null;
      const title = isNoAccountNoPayment
        ? pt.noBankAccountDefined
        : `${accountName} - ${paymentLabel}`;

      const existing = map.get(key);
      if (existing) {
        existing.items.push(item);
        existing.subtotal += item.amount;
      } else {
        map.set(key, {
          title,
          subtotal: item.amount,
          items: [item],
        });
      }
    }

    return Array.from(map.entries())
      .map(([key, value]) => {
        const [accKey, pmKey] = key.split("-");
        const isNoAccountNoPayment = accKey === "none" && pmKey === "none";
        return { key, ...value, isNoAccountNoPayment };
      })
      .sort((a, b) => {
        if (a.isNoAccountNoPayment && !b.isNoAccountNoPayment) return 1;
        if (!a.isNoAccountNoPayment && b.isNoAccountNoPayment) return -1;
        return a.title.localeCompare(b.title, "pt-BR");
      });
  }, [list]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const current = prev[key];
      return {
        ...prev,
        // se ainda não existe (começa expandido), primeiro toque recolhe (false)
        [key]: current === undefined ? false : !current,
      };
    });
  };

  const handleImportMonth = (month: number, year: number) => {
    setImportModalVisible(false);
    const { created, updated } = importFixedExpensesToMonth({ month, year });
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {pt.fixedExpensesSummary}
          </Text>
          {list.length > 0 && (
            <Text style={[styles.totalAmount, { color: colors.expense }]}>
              {pt.totalFixedExpenses}: {formatCurrency(totalAmount)}
            </Text>
          )}
        </View>
        {groups.length === 0 ? (
          <Text style={[styles.empty, { color: colors.tabIconDefault }]}>
            {pt.noFixedExpensesList}
          </Text>
        ) : (
          groups.map((group) => {
            const expanded = expandedGroups[group.key] ?? true;
            return (
              <View key={group.key} style={styles.section}>
                <Pressable
                  onPress={() => toggleGroup(group.key)}
                  style={({ pressed }) => [
                    styles.sectionHeader,
                    pressed && styles.pressed,
                  ]}
                >
                  <View>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      {group.title}
                    </Text>
                    <Text
                      style={[
                        styles.sectionSubtotal,
                        { color: colors.tabIconDefault },
                      ]}
                    >
                      {pt.subtotal}: {formatCurrency(group.subtotal)}
                    </Text>
                  </View>
                  <FontAwesome
                    name={expanded ? "chevron-down" : "chevron-right"}
                    size={18}
                    color={colors.tabIconDefault}
                  />
                </Pressable>
                {expanded &&
                  group.items.map((item) => (
                    <FixedExpenseRow
                      key={item.id}
                      item={item}
                      onPress={() =>
                        router.push(`/edit-fixed-expense?id=${item.id}` as never)
                      }
                      colors={colors}
                      formatCurrency={formatCurrency}
                    />
                  ))}
              </View>
            );
          })
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

      <View pointerEvents="box-none" style={fabContainerStyle}>
        {fabOpen && (
          <Pressable
            style={fabStyles.fabBackdrop}
            onPress={() => setFabOpen(false)}
          />
        )}
        <View
          style={[
            fabStyles.fabMenu,
            { alignItems: fabPosition === "right" ? "flex-end" : "flex-start" },
          ]}
        >
          <Animated.View
            pointerEvents={fabOpen ? "auto" : "none"}
            style={{
              opacity: fabAnim,
              transform: [
                {
                  translateY: fabAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [72, 0],
                  }),
                },
              ],
            }}
          >
            <View style={fabStyles.fabActionsWrap}>
              <Pressable
                onPress={() => {
                  setFabOpen(false);
                  setImportModalVisible(true);
                }}
                  style={({ pressed }) => [
                    fabStyles.fabActionCircle,
                  {
                    backgroundColor: "#0891B2",
                    marginBottom: 12,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <FontAwesome name="download" size={20} color="#fff" />
              </Pressable>
              <Pressable
                onPress={() => {
                  setFabOpen(false);
                  router.push("/add-fixed-expense" as never);
                }}
                  style={({ pressed }) => [
                    fabStyles.fabActionCircle,
                  { backgroundColor: colors.expenseButton },
                  pressed && styles.pressed,
                ]}
              >
                <FontAwesome name="plus" size={20} color="#fff" />
              </Pressable>
            </View>
          </Animated.View>

          <Pressable
            onPress={() => setFabOpen((open) => !open)}
              style={({ pressed }) => [
                fabStyles.fabMain,
              { backgroundColor: colors.tint },
              pressed && styles.pressed,
            ]}
          >
            <FontAwesome
              name={fabOpen ? "times" : "plus"}
              size={20}
              color="#fff"
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 120 },
  pressed: { opacity: 0.9 },
  section: { marginBottom: 24 },
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
  sectionSubtotal: {
    fontSize: 13,
    marginTop: 2,
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
