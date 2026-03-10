import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useThemeColors } from "@/hooks/useThemeColors";
import { pt } from "@/locales/pt";
import type { PaymentMethod } from "@/types";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export type BankAccountFormData = {
  name: string;
  credit_enabled: number;
  debit_enabled: number;
  pix_enabled: number;
  is_default: number;
  closing_day: number | null;
  due_day: number | null;
  default_payment_method: PaymentMethod | null;
};

interface Props {
  initialName?: string;
  initialCreditEnabled?: number;
  initialDebitEnabled?: number;
  initialPixEnabled?: number;
  initialIsDefault?: number;
  initialClosingDay?: number | null;
  initialDueDay?: number | null;
  initialDefaultPaymentMethod?: PaymentMethod | null;
  onSubmit: (data: BankAccountFormData) => void;
}

export function BankAccountForm({
  initialName = "",
  initialCreditEnabled = 0,
  initialDebitEnabled = 0,
  initialPixEnabled = 0,
  initialIsDefault = 0,
  initialClosingDay = null,
  initialDueDay = null,
  initialDefaultPaymentMethod = null,
  onSubmit,
}: Props) {
  const colors = useThemeColors();
  const [name, setName] = useState(initialName);
  const [creditEnabled, setCreditEnabled] = useState(initialCreditEnabled === 1);
  const [debitEnabled, setDebitEnabled] = useState(initialDebitEnabled === 1);
  const [pixEnabled, setPixEnabled] = useState(initialPixEnabled === 1);
  const [isDefault, setIsDefault] = useState(initialIsDefault === 1);
  const [closingDay, setClosingDay] = useState<number | null>(initialClosingDay);
  const [dueDay, setDueDay] = useState<number | null>(initialDueDay);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<PaymentMethod | null>(initialDefaultPaymentMethod ?? null);
  const [showClosingDayPicker, setShowClosingDayPicker] = useState(false);
  const [showDueDayPicker, setShowDueDayPicker] = useState(false);

  useEffect(() => {
    const enabled: PaymentMethod[] = [];
    if (creditEnabled) enabled.push("credit");
    if (debitEnabled) enabled.push("debit");
    if (pixEnabled) enabled.push("pix");
    if (enabled.length === 0) {
      setDefaultPaymentMethod(null);
    } else if (!defaultPaymentMethod || !enabled.includes(defaultPaymentMethod)) {
      setDefaultPaymentMethod(enabled[0]);
    }
  }, [creditEnabled, debitEnabled, pixEnabled]);

  const handleSubmit = () => {
    const nameTrim = name.trim();
    if (!nameTrim) {
      Alert.alert("Erro", "Informe o nome da conta.");
      return;
    }
    if (creditEnabled && (closingDay == null || closingDay < 1 || closingDay > 31)) {
      Alert.alert("Erro", "Informe o dia de fechamento da fatura (1 a 31).");
      return;
    }
    if (creditEnabled && (dueDay == null || dueDay < 1 || dueDay > 31)) {
      Alert.alert("Erro", "Informe o dia de vencimento (1 a 31).");
      return;
    }

    const enabledMethods: PaymentMethod[] = [];
    if (creditEnabled) enabledMethods.push("credit");
    if (debitEnabled) enabledMethods.push("debit");
    if (pixEnabled) enabledMethods.push("pix");
    const validDefault =
      defaultPaymentMethod && enabledMethods.includes(defaultPaymentMethod)
        ? defaultPaymentMethod
        : enabledMethods[0] ?? null;

    onSubmit({
      name: nameTrim,
      credit_enabled: creditEnabled ? 1 : 0,
      debit_enabled: debitEnabled ? 1 : 0,
      pix_enabled: pixEnabled ? 1 : 0,
      is_default: isDefault ? 1 : 0,
      closing_day: creditEnabled ? closingDay : null,
      due_day: creditEnabled ? dueDay : null,
      default_payment_method: validDefault,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={[styles.scroll, { backgroundColor: colors.background }]}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.field, { borderBottomColor: colors.tabIconDefault + "40" }]}>
            <Text style={[styles.label, { color: colors.text }]}>{pt.bankAccountName}</Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.theme.card }]}
              placeholder={pt.bankAccountNamePlaceholder}
              placeholderTextColor={colors.tabIconDefault}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View style={[styles.switchRow, { borderBottomColor: colors.tabIconDefault + "40" }]}>
            <Text style={[styles.label, { color: colors.text }]}>{pt.credit}</Text>
            <Switch
              value={creditEnabled}
              onValueChange={setCreditEnabled}
              trackColor={{ false: colors.tabIconDefault + "60", true: colors.tint + "80" }}
              thumbColor={creditEnabled ? colors.tint : "#f4f3f4"}
            />
          </View>
          <View style={[styles.switchRow, { borderBottomColor: colors.tabIconDefault + "40" }]}>
            <Text style={[styles.label, { color: colors.text }]}>{pt.debit}</Text>
            <Switch
              value={debitEnabled}
              onValueChange={setDebitEnabled}
              trackColor={{ false: colors.tabIconDefault + "60", true: colors.tint + "80" }}
              thumbColor={debitEnabled ? colors.tint : "#f4f3f4"}
            />
          </View>
          <View style={[styles.switchRow, { borderBottomColor: colors.tabIconDefault + "40" }]}>
            <Text style={[styles.label, { color: colors.text }]}>{pt.pix}</Text>
            <Switch
              value={pixEnabled}
              onValueChange={setPixEnabled}
              trackColor={{ false: colors.tabIconDefault + "60", true: colors.tint + "80" }}
              thumbColor={pixEnabled ? colors.tint : "#f4f3f4"}
            />
          </View>

          {creditEnabled && (
            <>
              <Pressable
                onPress={() => setShowClosingDayPicker(true)}
                style={[styles.field, styles.pickerTouch, { borderBottomColor: colors.tabIconDefault + "40" }]}
              >
                <Text style={[styles.label, { color: colors.text }]}>{pt.closingDay}</Text>
                <Text style={[styles.pickerValue, { color: colors.text }]}>
                  {closingDay != null ? closingDay : "Selecione"}
                </Text>
                <FontAwesome name="chevron-right" size={16} color={colors.tabIconDefault} />
              </Pressable>
              <Pressable
                onPress={() => setShowDueDayPicker(true)}
                style={[styles.field, styles.pickerTouch, { borderBottomColor: colors.tabIconDefault + "40" }]}
              >
                <Text style={[styles.label, { color: colors.text }]}>{pt.dueDay}</Text>
                <Text style={[styles.pickerValue, { color: colors.text }]}>
                  {dueDay != null ? dueDay : "Selecione"}
                </Text>
                <FontAwesome name="chevron-right" size={16} color={colors.tabIconDefault} />
              </Pressable>
            </>
          )}

          {(creditEnabled || debitEnabled || pixEnabled) && (
            <View style={[styles.field, { borderBottomColor: colors.tabIconDefault + "40" }]}>
              <Text style={[styles.label, { color: colors.text }]}>{pt.defaultPaymentMethod}</Text>
              <View style={styles.paymentMethodChips}>
                {creditEnabled && (
                  <Pressable
                    onPress={() => setDefaultPaymentMethod("credit")}
                    style={[
                      styles.paymentMethodChip,
                      {
                        backgroundColor: defaultPaymentMethod === "credit" ? colors.tint + "30" : colors.theme.card,
                        borderColor: defaultPaymentMethod === "credit" ? colors.tint : colors.tabIconDefault + "60",
                      },
                    ]}
                  >
                    <Text style={[styles.paymentMethodChipText, { color: defaultPaymentMethod === "credit" ? colors.tint : colors.text }]}>{pt.credit}</Text>
                  </Pressable>
                )}
                {debitEnabled && (
                  <Pressable
                    onPress={() => setDefaultPaymentMethod("debit")}
                    style={[
                      styles.paymentMethodChip,
                      {
                        backgroundColor: defaultPaymentMethod === "debit" ? colors.tint + "30" : colors.theme.card,
                        borderColor: defaultPaymentMethod === "debit" ? colors.tint : colors.tabIconDefault + "60",
                      },
                    ]}
                  >
                    <Text style={[styles.paymentMethodChipText, { color: defaultPaymentMethod === "debit" ? colors.tint : colors.text }]}>{pt.debit}</Text>
                  </Pressable>
                )}
                {pixEnabled && (
                  <Pressable
                    onPress={() => setDefaultPaymentMethod("pix")}
                    style={[
                      styles.paymentMethodChip,
                      {
                        backgroundColor: defaultPaymentMethod === "pix" ? colors.tint + "30" : colors.theme.card,
                        borderColor: defaultPaymentMethod === "pix" ? colors.tint : colors.tabIconDefault + "60",
                      },
                    ]}
                  >
                    <Text style={[styles.paymentMethodChipText, { color: defaultPaymentMethod === "pix" ? colors.tint : colors.text }]}>{pt.pix}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}

          <View style={[styles.switchRow, { borderBottomColor: colors.tabIconDefault + "40" }]}>
            <Text style={[styles.label, { color: colors.text }]}>{pt.useAsDefault}</Text>
            <Switch
              value={isDefault}
              onValueChange={setIsDefault}
              trackColor={{ false: colors.tabIconDefault + "60", true: colors.tint + "80" }}
              thumbColor={isDefault ? colors.tint : "#f4f3f4"}
            />
          </View>

          <Pressable
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: colors.tint },
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.submitButtonText}>{pt.save}</Text>
          </Pressable>
        </ScrollView>
      </TouchableWithoutFeedback>

      <Modal visible={showClosingDayPicker} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowClosingDayPicker(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.theme.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{pt.closingDay}</Text>
            <ScrollView style={styles.dayList}>
              {DAYS.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => {
                    setClosingDay(d);
                    setShowClosingDayPicker(false);
                  }}
                  style={[styles.dayRow, closingDay === d && { backgroundColor: colors.tint + "30" }]}
                >
                  <Text style={[styles.dayRowText, { color: colors.text }]}>{d}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={() => setShowClosingDayPicker(false)} style={styles.modalCancel}>
              <Text style={{ color: colors.tint }}>{pt.cancel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showDueDayPicker} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowDueDayPicker(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.theme.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{pt.dueDay}</Text>
            <ScrollView style={styles.dayList}>
              {DAYS.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => {
                    setDueDay(d);
                    setShowDueDayPicker(false);
                  }}
                  style={[styles.dayRow, dueDay === d && { backgroundColor: colors.tint + "30" }]}
                >
                  <Text style={[styles.dayRowText, { color: colors.text }]}>{d}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={() => setShowDueDayPicker(false)} style={styles.modalCancel}>
              <Text style={{ color: colors.tint }}>{pt.cancel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  field: {
    borderBottomWidth: 1,
    paddingVertical: 12,
    marginBottom: 8,
  },
  label: { fontSize: 14, marginBottom: 6, fontWeight: "600" },
  input: {
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    paddingVertical: 12,
    marginBottom: 8,
  },
  pickerTouch: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerValue: { fontSize: 16 },
  submitButton: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  pressed: { opacity: 0.9 },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: "50%",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  dayList: { maxHeight: 200 },
  dayRow: { paddingVertical: 14, paddingHorizontal: 8 },
  dayRowText: { fontSize: 16 },
  modalCancel: { marginTop: 12, alignItems: "center" },
  paymentMethodChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  paymentMethodChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  paymentMethodChipText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
