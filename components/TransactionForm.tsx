import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useThemeColors } from "@/hooks/useThemeColors";
import { formatCurrencyInput, parseCurrencyInput } from "@/utils/currencyInput";
import { formatDateStr, parseDateStr } from "@/utils/dateUtils";
import { pt } from "@/locales/pt";
import type { TransactionType, PaymentMethod } from "@/types";

interface Category {
  id: number;
  name: string;
  color: string;
}

interface BankAccount {
  id: number;
  name: string;
  credit_enabled: number;
  debit_enabled: number;
  pix_enabled: number;
  closing_day: number | null;
  due_day: number | null;
  default_payment_method?: PaymentMethod | null;
}

interface Props {
  type: TransactionType;
  categories: Category[];
  initialName?: string;
  initialAmount?: number;
  initialDate?: string;
  initialCategoryId?: number | null;
  initialNote?: string | null;
  enableInstallments?: boolean;
  accounts?: BankAccount[];
  initialAccountId?: number | null;
  initialPaymentMethod?: PaymentMethod | null;
  onSubmit: (data: {
    name: string;
    amount: number;
    date: string;
    categoryId: number | null;
    note: string | null;
    installmentsCount?: number;
    accountId?: number | null;
    paymentMethod?: PaymentMethod | null;
  }) => void;
}

function formatDateForInput(dateStr: string): Date {
  return parseDateStr(dateStr);
}

function formatDateForDb(date: Date): string {
  return formatDateStr(date);
}

export function TransactionForm({
  type,
  categories,
  initialName = "",
  initialAmount = 0,
  initialDate,
  initialCategoryId,
  initialNote = "",
  enableInstallments = false,
  accounts = [],
  initialAccountId,
  initialPaymentMethod,
  onSubmit,
}: Props) {
  const colors = useThemeColors();
  const formatAmountValue = (value: number) =>
    value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const [name, setName] = useState(initialName);
  const [amountStr, setAmountStr] = useState(
    initialAmount > 0 ? formatAmountValue(initialAmount) : ""
  );
  const [date, setDate] = useState(
    initialDate ? formatDateForInput(initialDate) : new Date()
  );
  const [categoryId, setCategoryId] = useState<number | null>(
    initialCategoryId ?? null
  );
  const [note, setNote] = useState(initialNote ?? "");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showAddAmountModal, setShowAddAmountModal] = useState(false);
  const [addAmountStr, setAddAmountStr] = useState("");
  const addAmountInputRef = useRef<TextInput>(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentsCountStr, setInstallmentsCountStr] = useState("2");
  const [accountId, setAccountId] = useState<number | null>(initialAccountId ?? null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(initialPaymentMethod ?? null);

  useEffect(() => {
    if (!accountId || accounts.length === 0) return;
    const acc = accounts.find((a) => a.id === accountId);
    if (!acc) return;
    const enabled: PaymentMethod[] = [];
    if (acc.credit_enabled) enabled.push("credit");
    if (acc.debit_enabled) enabled.push("debit");
    if (acc.pix_enabled) enabled.push("pix");
    if (enabled.length === 0) return;
    const defaultPm = acc.default_payment_method && enabled.includes(acc.default_payment_method)
      ? acc.default_payment_method
      : enabled[0];
    setPaymentMethod(defaultPm);
  }, [accountId, accounts]);

  const closeCategoryPicker = () => setShowCategoryPicker(false);
  const closeAddAmountModal = () => {
    setShowAddAmountModal(false);
    setAddAmountStr("");
  };

  const focusAddAmountInput = () => {
    requestAnimationFrame(() => {
      setTimeout(() => addAmountInputRef.current?.focus(), 120);
    });
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase().trim())
  );

  const handleSubmit = () => {
    const amount = parseCurrencyInput(amountStr);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Erro", "Informe um valor válido.");
      return;
    }
    if (type === "expense" && categories.length === 0) {
      Alert.alert(
        "Categorias necessárias",
        "Cadastre pelo menos uma categoria em Configurações > Categorias antes de adicionar uma despesa."
      );
      return;
    }
    if (type === "expense" && categories.length > 0 && !categoryId) {
      Alert.alert("Erro", "Selecione uma categoria.");
      return;
    }
    if (type === "expense" && name.trim() === "") {
      Alert.alert("Erro", "Informe o nome da despesa.");
      return;
    }

    let installmentsCount = 1;
    if (enableInstallments && isInstallment) {
      const parsedInstallments = parseInt(installmentsCountStr, 10);
      if (isNaN(parsedInstallments) || parsedInstallments < 2) {
        Alert.alert("Erro", pt.installmentsCountInvalid);
        return;
      }
      installmentsCount = parsedInstallments;
    }

    let effectivePaymentMethod = paymentMethod;
    if (accounts.length > 0 && accountId != null && (effectivePaymentMethod == null || effectivePaymentMethod === null)) {
      const acc = accounts.find((a) => a.id === accountId);
      if (acc) {
        const enabled: PaymentMethod[] = [];
        if (acc.credit_enabled) enabled.push("credit");
        if (acc.debit_enabled) enabled.push("debit");
        if (acc.pix_enabled) enabled.push("pix");
        effectivePaymentMethod = (acc.default_payment_method && enabled.includes(acc.default_payment_method))
          ? acc.default_payment_method
          : enabled[0] ?? undefined;
      }
    }

    onSubmit({
      name: name.trim() || (type === "income" ? "Entrada" : "Despesa"),
      amount,
      date: formatDateForDb(date),
      categoryId: type === "expense" ? categoryId : null,
      note: note.trim() || null,
      installmentsCount,
      accountId: accounts.length > 0 ? accountId : undefined,
      paymentMethod: accounts.length > 0 ? (effectivePaymentMethod ?? paymentMethod) : undefined,
    });
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);

  useEffect(() => {
    if (!showAddAmountModal) return;
    focusAddAmountInput();
  }, [showAddAmountModal]);

  const handleAddAmount = () => {
    const increment = parseCurrencyInput(addAmountStr);
    if (isNaN(increment) || increment <= 0) {
      Alert.alert("Erro", "Informe um valor válido para somar.");
      return;
    }
    const currentAmount = parseCurrencyInput(amountStr);
    const safeCurrentAmount = isNaN(currentAmount) ? 0 : currentAmount;
    const nextAmount = safeCurrentAmount + increment;
    setAmountStr(formatAmountValue(nextAmount));
    closeAddAmountModal();
  };

  const handleIncrementInstallments = () => {
    const current = parseInt(installmentsCountStr, 10);
    const next = isNaN(current) ? 2 : Math.max(2, current + 1);
    setInstallmentsCountStr(String(next));
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>
          {type === "expense" ? "Nome *" : "Nome"}
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.theme.card,
              color: colors.text,
              borderColor: colors.tabIconDefault,
            },
          ]}
          placeholder={pt.namePlaceholder}
          placeholderTextColor={colors.tabIconDefault}
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Valor *</Text>
        <View
          style={[
            styles.input,
            styles.amountInputRow,
            {
              backgroundColor: colors.theme.card,
              borderColor: colors.tabIconDefault,
            },
          ]}
        >
          <TextInput
            style={[styles.amountTextInput, { color: colors.text }]}
            placeholder="0,00"
            placeholderTextColor={colors.tabIconDefault}
            keyboardType="numeric"
            value={amountStr}
            onChangeText={(t) => setAmountStr(formatCurrencyInput(t))}
          />
          <Pressable
            onPress={() => setShowAddAmountModal(true)}
            style={({ pressed }) => [styles.addAmountIconButton, pressed && styles.pressed]}
            hitSlop={8}
          >
            <FontAwesome name="plus-circle" size={22} color={colors.income} />
          </Pressable>
        </View>
        <Modal
          visible={showAddAmountModal}
          transparent
          animationType="fade"
          onRequestClose={closeAddAmountModal}
          onShow={focusAddAmountInput}
        >
          <Pressable
            style={styles.inlineModalOverlay}
            onPress={closeAddAmountModal}
          >
            <Pressable
              style={[
                styles.inlineModalContent,
                { backgroundColor: colors.theme.card },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={[styles.inlineModalTitle, { color: colors.text }]}>
                Somar valor
              </Text>
              <TextInput
                ref={addAmountInputRef}
                style={[
                  styles.inlineModalInput,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.tabIconDefault,
                  },
                ]}
                placeholder="0,00"
                placeholderTextColor={colors.tabIconDefault}
                keyboardType="numeric"
                value={addAmountStr}
                onChangeText={(t) => setAddAmountStr(formatCurrencyInput(t))}
                returnKeyType="done"
                onSubmitEditing={handleAddAmount}
                blurOnSubmit
              />
              <View style={styles.inlineModalActions}>
                <Pressable
                  onPress={closeAddAmountModal}
                  style={({ pressed }) => [
                    styles.inlineModalActionButton,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.tabIconDefault,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={{ color: colors.text, fontWeight: "600" }}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={handleAddAmount}
                  style={({ pressed }) => [
                    styles.inlineModalActionButton,
                    { backgroundColor: colors.tint },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Somar</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Data</Text>
        <Pressable
          onPress={() => setShowDatePicker(true)}
          style={[
            styles.input,
            styles.picker,
            {
              backgroundColor: colors.theme.card,
              borderColor: colors.tabIconDefault,
            },
          ]}
        >
          <Text style={{ color: colors.text }}>
            {date.toLocaleDateString("pt-BR")}
          </Text>
          <FontAwesome name="calendar" size={18} color={colors.tabIconDefault} />
        </Pressable>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(_, d) => {
              setShowDatePicker(Platform.OS === "ios");
              if (d) setDate(d);
            }}
          />
        )}
      </View>

      {accounts.length > 0 && (
        <>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>{pt.bankAccount}</Text>
            <Pressable
              onPress={() => setShowAccountPicker(true)}
              style={[
                styles.input,
                styles.picker,
                {
                  backgroundColor: colors.theme.card,
                  borderColor: colors.tabIconDefault,
                },
              ]}
            >
              <Text
                style={[
                  { fontSize: 16 },
                  accountId ? { color: colors.text } : { color: colors.tabIconDefault },
                ]}
              >
                {accountId
                  ? accounts.find((a) => a.id === accountId)?.name ?? ""
                  : pt.selectAccount}
              </Text>
              <FontAwesome name="chevron-right" size={16} color={colors.tabIconDefault} />
            </Pressable>
          </View>
          {accountId && (() => {
            const acc = accounts.find((a) => a.id === accountId);
            if (!acc) return null;
            const paymentOptions: { value: PaymentMethod; label: string }[] = [
              ...(acc.credit_enabled ? [{ value: "credit" as const, label: pt.credit }] : []),
              ...(acc.debit_enabled ? [{ value: "debit" as const, label: pt.debit }] : []),
              ...(acc.pix_enabled ? [{ value: "pix" as const, label: pt.pix }] : []),
            ];
            if (paymentOptions.length === 0) return null;
            return (
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{pt.paymentMethod}</Text>
                <View style={styles.paymentMethodChips}>
                  {paymentOptions.map((opt) => {
                    const isSelected = paymentMethod === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setPaymentMethod(opt.value)}
                        style={[
                          styles.paymentMethodChip,
                          {
                            backgroundColor: isSelected ? colors.tint + "30" : colors.theme.card,
                            borderColor: isSelected ? colors.tint : colors.tabIconDefault + "60",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.paymentMethodChipText,
                            { color: isSelected ? colors.tint : colors.text },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })()}
          <Modal visible={showAccountPicker} transparent animationType="fade">
            <Pressable style={styles.inlineModalOverlay} onPress={() => setShowAccountPicker(false)}>
              <Pressable
                style={[styles.inlineModalContent, { backgroundColor: colors.theme.card }]}
                onPress={(e) => e.stopPropagation()}
              >
                <Text style={[styles.inlineModalTitle, { color: colors.text }]}>
                  {pt.bankAccount}
                </Text>
                {accounts.map((a) => (
                  <Pressable
                    key={a.id}
                    onPress={() => {
                      setAccountId(a.id);
                      setShowAccountPicker(false);
                    }}
                    style={styles.modalOption}
                  >
                    <Text style={{ color: colors.text }}>{a.name}</Text>
                  </Pressable>
                ))}
              </Pressable>
            </Pressable>
          </Modal>
        </>
      )}

      {enableInstallments && (
        <View style={styles.field}>
          <Pressable
            onPress={() => setIsInstallment((prev) => !prev)}
            style={({ pressed }) => [
              styles.installmentToggle,
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: colors.tabIconDefault,
                  backgroundColor:
                    isInstallment
                      ? (type === "income" ? colors.income : colors.expense) + "40"
                      : "transparent",
                },
              ]}
            >
              {isInstallment ? (
                <FontAwesome
                  name="check"
                  size={12}
                  color={type === "income" ? colors.income : colors.expense}
                />
              ) : null}
            </View>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>
              {pt.installment}
            </Text>
          </Pressable>

          {isInstallment && (
            <View style={styles.installmentsField}>
              <Text style={[styles.label, { color: colors.text }]}>{pt.installmentsCount}</Text>
              <View
                style={[
                  styles.input,
                  styles.installmentsInputRow,
                  {
                    backgroundColor: colors.theme.card,
                    borderColor: colors.tabIconDefault,
                  },
                ]}
              >
                <TextInput
                  style={[styles.installmentsTextInput, { color: colors.text }]}
                  placeholder={pt.installmentsCountPlaceholder}
                  placeholderTextColor={colors.tabIconDefault}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  value={installmentsCountStr}
                  onChangeText={(t) => setInstallmentsCountStr(t.replace(/\D/g, ""))}
                />
                <Pressable
                  onPress={handleIncrementInstallments}
                  style={({ pressed }) => [styles.installmentsAddButton, pressed && styles.pressed]}
                  hitSlop={8}
                >
                  <FontAwesome name="plus-circle" size={22} color={colors.income} />
                </Pressable>
              </View>
            </View>
          )}
        </View>
      )}

      {type === "expense" && categories.length > 0 && (
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Categoria *</Text>
          <View
            style={[
              styles.input,
              styles.categoryInputRow,
              {
                backgroundColor: colors.theme.card,
                borderColor: colors.tabIconDefault,
              },
            ]}
          >
            <Pressable
              style={styles.categoryTextInput}
              onPress={() => {
                setShowCategoryPicker(true);
                setCategorySearch(selectedCategory?.name ?? "");
              }}
            >
              <Text
                style={[
                  { fontSize: 16 },
                  selectedCategory?.name
                    ? { color: colors.text }
                    : { color: colors.tabIconDefault },
                ]}
                numberOfLines={1}
              >
                {selectedCategory?.name ?? pt.categorySearchPlaceholder}
              </Text>
            </Pressable>
            {selectedCategory?.name ? (
              <Pressable
                onPress={() => {
                  setCategoryId(null);
                  setCategorySearch("");
                  setShowCategoryPicker(true);
                }}
                style={({ pressed }) => [
                  styles.clearButton,
                  pressed && styles.pressed,
                ]}
                hitSlop={8}
              >
                <FontAwesome name="times-circle" size={20} color={colors.tabIconDefault} />
              </Pressable>
            ) : null}
          </View>
          <Modal
            visible={showCategoryPicker}
            transparent
            animationType="fade"
            onRequestClose={closeCategoryPicker}
          >
            <Pressable
              style={styles.categoryModalOverlay}
              onPress={closeCategoryPicker}
            >
              <Pressable
                style={[
                  styles.categoryModalContent,
                  { backgroundColor: colors.theme.card },
                ]}
                onPress={(e) => e.stopPropagation()}
              >
                <View style={styles.categoryModalSearch}>
                  <View style={styles.categoryModalSearchRow}>
                    <TextInput
                      style={[
                        styles.categorySearchInput,
                        {
                          backgroundColor: colors.background,
                          color: colors.text,
                          borderColor: colors.tabIconDefault,
                        },
                      ]}
                      placeholder={pt.categorySearchPlaceholder}
                      placeholderTextColor={colors.tabIconDefault}
                      value={categorySearch}
                      onChangeText={setCategorySearch}
                      autoFocus
                    />
                    {categorySearch ? (
                      <Pressable
                        onPress={() => setCategorySearch("")}
                        style={({ pressed }) => [
                          styles.clearButton,
                          pressed && styles.pressed,
                        ]}
                        hitSlop={8}
                      >
                        <FontAwesome name="times-circle" size={20} color={colors.tabIconDefault} />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
                <ScrollView
                  style={styles.categoryScroll}
                  keyboardShouldPersistTaps="always"
                >
                  {filteredCategories.length === 0 ? (
                    <Text
                      style={[
                        styles.categoryEmpty,
                        { color: colors.tabIconDefault },
                      ]}
                    >
                      {pt.noCategoryFound}
                    </Text>
                  ) : (
                    filteredCategories.map((cat) => (
                      <Pressable
                        key={cat.id}
                        onPress={() => {
                          setCategoryId(cat.id);
                          setCategorySearch(cat.name);
                          setShowCategoryPicker(false);
                        }}
                        style={[
                          styles.categoryItem,
                          categoryId === cat.id && {
                            backgroundColor: colors.tint + "30",
                          },
                        ]}
                      >
                        <View
                          style={[styles.colorDot, { backgroundColor: cat.color }]}
                        />
                        <Text style={{ color: colors.text }}>{cat.name}</Text>
                      </Pressable>
                    ))
                  )}
                </ScrollView>
              </Pressable>
            </Pressable>
          </Modal>
        </View>
      )}

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Observação</Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            {
              backgroundColor: colors.theme.card,
              color: colors.text,
              borderColor: colors.tabIconDefault,
            },
          ]}
          placeholder="Opcional"
          placeholderTextColor={colors.tabIconDefault}
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={[styles.submitButtonContainer, { backgroundColor: colors.background }]}>
        <Pressable
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.submitButton,
            { backgroundColor: type === "income" ? colors.incomeButton : colors.expenseButton },
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.submitText}>Salvar</Text>
        </Pressable>
      </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === "ios" ? 120 : 80,
  },
  submitButtonContainer: {
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  field: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  amountInputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 0,
    paddingRight: 8,
  },
  amountTextInput: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 8,
    fontSize: 16,
  },
  addAmountIconButton: {
    padding: 6,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  installmentToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  installmentsField: {
    marginTop: 12,
  },
  installmentsInputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 0,
    paddingRight: 8,
  },
  installmentsTextInput: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 8,
    fontSize: 16,
  },
  installmentsAddButton: {
    padding: 6,
  },
  categoryInputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 14,
    paddingRight: 8,
  },
  categoryTextInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
  clearButton: {
    padding: 4,
  },
  picker: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentMethodChips: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  paymentMethodChip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentMethodChipText: {
    fontSize: 15,
    fontWeight: "600",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  categoryList: {
    marginTop: 8,
    borderRadius: 12,
    overflow: "hidden",
    maxHeight: 200,
  },
  categoryModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 120,
  },
  inlineModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  inlineModalContent: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  inlineModalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  inlineModalInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  inlineModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  inlineModalActionButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  categoryModalContent: {
    borderRadius: 12,
    maxHeight: 400,
    overflow: "hidden",
  },
  categoryModalSearch: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  categoryModalSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categorySearchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  categoryScroll: {
    maxHeight: 320,
  },
  categoryEmpty: {
    padding: 14,
    fontSize: 14,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  submitButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.9,
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
});
