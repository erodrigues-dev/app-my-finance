import React, { useState } from "react";
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
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useThemeColors } from "@/hooks/useThemeColors";
import { formatCurrencyInput, parseCurrencyInput } from "@/utils/currencyInput";
import type { TransactionType } from "@/types";

interface Category {
  id: number;
  name: string;
  color: string;
}

interface Props {
  type: TransactionType;
  categories: Category[];
  initialName?: string;
  initialAmount?: number;
  initialDate?: string;
  initialCategoryId?: number | null;
  initialNote?: string | null;
  onSubmit: (data: {
    name: string;
    amount: number;
    date: string;
    categoryId: number | null;
    note: string | null;
  }) => void;
}

function formatDateForInput(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function formatDateForDb(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function TransactionForm({
  type,
  categories,
  initialName = "",
  initialAmount = 0,
  initialDate,
  initialCategoryId,
  initialNote = "",
  onSubmit,
}: Props) {
  const colors = useThemeColors();
  const [name, setName] = useState(initialName);
  const [amountStr, setAmountStr] = useState(
    initialAmount > 0
      ? initialAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : ""
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

    onSubmit({
      name: name.trim() || (type === "income" ? "Entrada" : "Despesa"),
      amount,
      date: formatDateForDb(date),
      categoryId: type === "expense" ? categoryId : null,
      note: note.trim() || null,
    });
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);

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
      {type === "expense" && (
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Nome *</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.theme.card,
                color: colors.text,
                borderColor: colors.tabIconDefault,
              },
            ]}
            placeholder="Ex: Supermercado"
            placeholderTextColor={colors.tabIconDefault}
            value={name}
            onChangeText={setName}
          />
        </View>
      )}

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Valor *</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.theme.card,
              color: colors.text,
              borderColor: colors.tabIconDefault,
            },
          ]}
          placeholder="0,00"
          placeholderTextColor={colors.tabIconDefault}
          keyboardType="numeric"
          value={amountStr}
          onChangeText={(t) => setAmountStr(formatCurrencyInput(t))}
        />
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

      {type === "expense" && categories.length > 0 && (
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Categoria *</Text>
          <Pressable
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
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
              style={{
                color: selectedCategory ? colors.text : colors.tabIconDefault,
              }}
            >
              {selectedCategory?.name ?? "Selecione a categoria"}
            </Text>
            <FontAwesome
              name={showCategoryPicker ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.tabIconDefault}
            />
          </Pressable>
          {showCategoryPicker && (
            <View
              style={[
                styles.categoryList,
                { backgroundColor: colors.theme.card },
              ]}
            >
              {categories.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => {
                    setCategoryId(cat.id);
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
              ))}
            </View>
          )}
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
  picker: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  categoryList: {
    marginTop: 8,
    borderRadius: 12,
    overflow: "hidden",
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
});
