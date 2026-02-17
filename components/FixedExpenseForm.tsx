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
  Modal,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useThemeColors } from "@/hooks/useThemeColors";
import { pt } from "@/locales/pt";
import { formatCurrencyInput, parseCurrencyInput } from "@/utils/currencyInput";

interface Category {
  id: number;
  name: string;
  color: string;
}

interface Props {
  categories: Category[];
  initialName?: string;
  initialAmount?: number;
  initialDueDay?: number;
  initialCategoryId?: number | null;
  initialNote?: string | null;
  onSubmit: (data: {
    name: string;
    amount: number;
    due_day: number;
    categoryId: number | null;
    note: string | null;
  }) => void;
}

const DUE_DAYS = Array.from({ length: 30 }, (_, i) => i + 1);

export function FixedExpenseForm({
  categories,
  initialName = "",
  initialAmount = 0,
  initialDueDay = 10,
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
  const [dueDay, setDueDay] = useState(initialDueDay);
  const [categoryId, setCategoryId] = useState<number | null>(initialCategoryId ?? null);
  const [note, setNote] = useState(initialNote ?? "");
  const [showDueDayPicker, setShowDueDayPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");

  const closeCategoryPicker = () => setShowCategoryPicker(false);

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase().trim())
  );

  const handleSubmit = () => {
    const amount = parseCurrencyInput(amountStr);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Erro", "Informe um valor válido.");
      return;
    }
    if (categories.length === 0) {
      Alert.alert(
        "Categorias necessárias",
        "Cadastre pelo menos uma categoria em Configurações > Categorias antes de adicionar um gasto fixo."
      );
      return;
    }
    if (categories.length > 0 && !categoryId) {
      Alert.alert("Erro", "Selecione uma categoria.");
      return;
    }
    if (name.trim() === "") {
      Alert.alert("Erro", "Informe o nome do gasto fixo.");
      return;
    }

    onSubmit({
      name: name.trim(),
      amount,
      due_day: dueDay,
      categoryId,
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
              placeholder="Ex: Aluguel"
              placeholderTextColor={colors.tabIconDefault}
              value={name}
              onChangeText={setName}
            />
          </View>

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
            <Text style={[styles.label, { color: colors.text }]}>{pt.dueDay} *</Text>
            <Pressable
              onPress={() => setShowDueDayPicker(!showDueDayPicker)}
              style={[
                styles.input,
                styles.picker,
                {
                  backgroundColor: colors.theme.card,
                  borderColor: colors.tabIconDefault,
                },
              ]}
            >
              <Text style={{ color: colors.text }}>Dia {dueDay}</Text>
              <FontAwesome
                name={showDueDayPicker ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.tabIconDefault}
              />
            </Pressable>
            <Modal
              visible={showDueDayPicker}
              transparent
              animationType="fade"
              onRequestClose={() => setShowDueDayPicker(false)}
            >
              <Pressable
                style={styles.categoryModalOverlay}
                onPress={() => setShowDueDayPicker(false)}
              >
                <Pressable
                  style={[
                    styles.dueDayModalContent,
                    { backgroundColor: colors.theme.card },
                  ]}
                  onPress={(e) => e.stopPropagation()}
                >
                  <Text style={[styles.dueDayModalTitle, { color: colors.text }]}>
                    {pt.dueDay}
                  </Text>
                  <ScrollView
                    style={styles.dueDayScroll}
                    showsVerticalScrollIndicator
                    keyboardShouldPersistTaps="handled"
                  >
                    {DUE_DAYS.map((day) => (
                      <Pressable
                        key={day}
                        onPress={() => {
                          setDueDay(day);
                          setShowDueDayPicker(false);
                        }}
                        style={[
                          styles.categoryItem,
                          dueDay === day && {
                            backgroundColor: colors.tint + "30",
                          },
                        ]}
                      >
                        <Text style={{ color: colors.text }}>Dia {day}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </Pressable>
              </Pressable>
            </Modal>
          </View>

          {categories.length > 0 && (
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
            <Text style={[styles.label, { color: colors.text }]}>{pt.note}</Text>
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
              placeholder={pt.notePlaceholder}
              placeholderTextColor={colors.tabIconDefault}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
            />
          </View>

          <View
            style={[
              styles.submitButtonContainer,
              { backgroundColor: colors.background },
            ]}
          >
            <Pressable
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.submitButton,
                { backgroundColor: colors.expenseButton },
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.submitText}>{pt.save}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingBottom: Platform.OS === "ios" ? 120 : 80,
  },
  submitButtonContainer: {
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  field: { marginHorizontal: 16, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
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
  textArea: { minHeight: 80, textAlignVertical: "top" as const },
  categoryList: {
    marginTop: 8,
    borderRadius: 12,
    overflow: "hidden",
    maxHeight: 200,
  },
  dueDayModalContent: {
    borderRadius: 12,
    maxHeight: 400,
    overflow: "hidden",
    padding: 12,
  },
  dueDayModalTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  dueDayScroll: {
    maxHeight: 320,
  },
  categoryModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 120,
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
  categoryScroll: { maxHeight: 320 },
  categoryEmpty: { padding: 14, fontSize: 14 },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
  },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  submitButton: { padding: 16, borderRadius: 12, alignItems: "center" },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  pressed: { opacity: 0.9 },
});
