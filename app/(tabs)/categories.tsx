import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
  InteractionManager,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import ColorPicker, { Panel1, HueSlider } from "reanimated-color-picker";
import { useThemeColors } from "@/hooks/useThemeColors";
import { getAllCategories, createCategory, updateCategory, deleteCategory } from "@/services/categoryService";
import {
  loadCustomColors,
  addCustomColor,
  updateCustomColor,
  removeCustomColor,
} from "@/services/customColorsService";
import { getCategoriesByColor } from "@/services/categoryService";
import { formatCurrencyInput, parseCurrencyInput } from "@/utils/currencyInput";
import { categoryColors } from "@/theme";
import { useValuesVisibility } from "@/context/ValuesVisibilityContext";
import { pt } from "@/locales/pt";

const allPredefinedColors: string[] = [...categoryColors];

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#333333" : "#FFFFFF";
}

function normalizeHex(hex: string): string {
  const match = hex.match(/^#?([0-9A-Fa-f]{6})([0-9A-Fa-f]{2})?$/);
  return match ? `#${match[1].toLowerCase()}` : hex;
}

export default function CategoriesScreen() {
  const colors = useThemeColors();
  const { formatCurrency: formatCurrencyDisplay } = useValuesVisibility();
  const [categories, setCategories] = useState(getAllCategories());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formLimit, setFormLimit] = useState("");
  const [formColor, setFormColor] = useState<string>(allPredefinedColors[0]);
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [showColorPickerModal, setShowColorPickerModal] = useState(false);
  const [colorPickerMode, setColorPickerMode] = useState<"add" | "edit">("add");
  const [editingColorIndex, setEditingColorIndex] = useState<number>(-1);
  const [colorPickerValue, setColorPickerValue] = useState<string>(allPredefinedColors[0]);
  const colorPickerValueRef = useRef<string>(allPredefinedColors[0]);
  const scrollViewRef = useRef<ScrollView>(null);

  colorPickerValueRef.current = colorPickerValue;

  const scrollToBottom = useCallback(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, []);

  useEffect(() => {
    loadCustomColors().then(setCustomColors);
  }, []);

  useEffect(() => {
    const subShow = Keyboard.addListener("keyboardDidShow", scrollToBottom);
    return () => subShow.remove();
  }, [scrollToBottom]);

  const refresh = () => setCategories(getAllCategories());

  const handleSave = () => {
    const name = formName.trim();
    if (!name) {
      Alert.alert("Erro", "Informe o nome da categoria.");
      return;
    }
    const limit = formLimit ? parseCurrencyInput(formLimit) : null;
    if (formLimit && (isNaN(limit!) || limit! < 0)) {
      Alert.alert("Erro", "Limite inválido.");
      return;
    }

    if (editingId) {
      updateCategory(editingId, name, limit, formColor);
    } else {
      createCategory(name, limit, formColor);
    }
    setShowForm(false);
    setEditingId(null);
    setFormName("");
    setFormLimit("");
    setFormColor(allPredefinedColors[0]);
    setShowColorPickerModal(false);
    refresh();
  };

  const handleEdit = (id: number) => {
    scrollToBottom();
    const cat = categories.find((c) => c.id === id);
    if (cat) {
      setEditingId(id);
      setFormName(cat.name);
      setFormLimit(
        cat.limit != null ? formatCurrencyInput(String(Math.round(cat.limit * 100))) : ""
      );
      setFormColor(cat.color);
      if (
        !allPredefinedColors.includes(cat.color) &&
        !customColors.includes(cat.color) &&
        /^#[0-9A-Fa-f]{6}$/.test(cat.color)
      ) {
        addCustomColor(cat.color).then(setCustomColors);
      }
      setShowForm(true);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      "Excluir categoria",
      "Tem certeza? As transações desta categoria ficarão sem categoria.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            deleteCategory(id);
            if (editingId === id) {
              setShowForm(false);
              setEditingId(null);
            }
            refresh();
          },
        },
      ]
    );
  };

  const handleAdd = () => {
    scrollToBottom();
    setEditingId(null);
    setFormName("");
    setFormLimit("");
    setFormColor(allPredefinedColors[0]);
    setShowColorPickerModal(false);
    setShowForm(true);
  };

  const openColorPickerAdd = () => {
    const initial = formColor || allPredefinedColors[0];
    setColorPickerMode("add");
    setEditingColorIndex(-1);
    colorPickerValueRef.current = initial;
    setColorPickerValue(initial);
    setShowColorPickerModal(true);
  };

  const openColorPickerEdit = (index: number) => {
    const initial = customColors[index];
    setColorPickerMode("edit");
    setEditingColorIndex(index);
    colorPickerValueRef.current = initial;
    setColorPickerValue(initial);
    setShowColorPickerModal(true);
  };

  const applyColorFromPicker = async () => {
    const rawHex = colorPickerValueRef.current;
    const hex = typeof rawHex === "string" ? normalizeHex(rawHex) : "";
    if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return;

    setShowColorPickerModal(false);

    if (colorPickerMode === "add") {
      const next = await addCustomColor(hex);
      setCustomColors(next);
    } else {
      const next = await updateCustomColor(editingColorIndex, hex);
      setCustomColors(next);
    }

    InteractionManager.runAfterInteractions(() => {
      setFormColor(hex);
    });
  };

  const selectColor = (hex: string) => {
    setFormColor(hex);
  };

  const handleDeleteCustomColor = (index: number) => {
    const colorToDelete = customColors[index];
    const wasSelected = normalizeHex(formColor) === normalizeHex(colorToDelete);
    const categoriesUsingColor = getCategoriesByColor(colorToDelete);

    const doDelete = async () => {
      const next = await removeCustomColor(index);
      setCustomColors(next);
      if (wasSelected) {
        setFormColor(allPredefinedColors[0]);
      }
    };

    if (categoriesUsingColor.length > 0) {
      const names = categoriesUsingColor.map((c) => c.name).join(", ");
      Alert.alert(
        pt.deleteColorInUseTitle,
        `${pt.deleteColorInUseMessage}\n\n${names}\n\n${pt.deleteColorInUseHint}`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Excluir",
            style: "destructive",
            onPress: doDelete,
          },
        ]
      );
    } else {
      Alert.alert(
        pt.deleteColorTitle,
        pt.deleteColorMessage,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Excluir",
            style: "destructive",
            onPress: doDelete,
          },
        ]
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          ref={scrollViewRef}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={styles.scrollContent}
        >
        {categories.length === 0 && !showForm ? (
          <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
            {pt.noCategories}
          </Text>
        ) : (
          categories.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => handleEdit(cat.id)}
              style={({ pressed }) => [
                styles.categoryCard,
                { backgroundColor: colors.theme.card },
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.colorDot, { backgroundColor: cat.color }]} />
              <View style={styles.categoryInfo}>
                <Text style={[styles.categoryName, { color: colors.text }]}>
                  {cat.name}
                </Text>
                <Text style={[styles.categoryLimit, { color: colors.tabIconDefault }]}>
                  Limite:{" "}
                  {cat.limit != null ? formatCurrencyDisplay(cat.limit) : "Sem limite"}
                </Text>
              </View>
              <Pressable
                onPress={() => handleDelete(cat.id)}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.deleteBtn,
                  pressed && styles.pressed,
                ]}
              >
                <FontAwesome name="trash-o" size={20} color={colors.expense} />
              </Pressable>
            </Pressable>
          ))
        )}

        {showForm && (
          <View style={[styles.form, { backgroundColor: colors.theme.card }]}>
            <Text style={[styles.label, { color: colors.text }]}>
              {pt.categoryName}
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.background, color: colors.text },
              ]}
              placeholder="Nome"
              placeholderTextColor={colors.tabIconDefault}
              value={formName}
              onChangeText={setFormName}
            />
            <Text style={[styles.label, { color: colors.text }]}>
              {pt.limit}
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.background, color: colors.text },
              ]}
              placeholder="0,00 (opcional)"
              placeholderTextColor={colors.tabIconDefault}
              keyboardType="numeric"
              value={formLimit}
              onChangeText={(t) => setFormLimit(formatCurrencyInput(t))}
            />
            <Text style={[styles.label, { color: colors.text }]}>
              {pt.color}
            </Text>
            <View style={styles.colorPicker}>
              {allPredefinedColors.map((c) => {
                const isSelected = normalizeHex(formColor) === normalizeHex(c);
                return (
                  <Pressable
                    key={`pre-${c}`}
                    onPress={() => selectColor(c)}
                    style={[
                      styles.colorOption,
                      { backgroundColor: c },
                      isSelected && [styles.colorOptionSelected, { borderColor: colors.text }],
                    ]}
                  >
                    {isSelected && (
                      <FontAwesome
                        name="check"
                        size={18}
                        color={getContrastColor(c)}
                      />
                    )}
                  </Pressable>
                );
              })}
              {customColors.map((c, idx) => {
                const isSelected = normalizeHex(formColor) === normalizeHex(c);
                return (
                  <View key={`custom-${idx}-${c}`} style={styles.colorOptionWrapper}>
                    <Pressable
                      onPress={() => openColorPickerEdit(idx)}
                      style={[
                        styles.colorOption,
                        styles.colorOptionEditable,
                        { backgroundColor: c },
                        isSelected && [styles.colorOptionSelected, { borderColor: colors.text }],
                      ]}
                    >
                      {isSelected ? (
                        <FontAwesome
                          name="check"
                          size={18}
                          color={getContrastColor(c)}
                        />
                      ) : (
                        <FontAwesome
                          name="pencil"
                          size={12}
                          color={getContrastColor(c)}
                        />
                      )}
                    </Pressable>
                    <Pressable
                      onPress={() => handleDeleteCustomColor(idx)}
                      hitSlop={8}
                      style={[styles.colorOptionDelete, { backgroundColor: colors.expense }]}
                    >
                      <FontAwesome name="times" size={10} color="#fff" />
                    </Pressable>
                  </View>
                );
              })}
              <Pressable
                onPress={openColorPickerAdd}
                style={[
                  styles.colorOption,
                  styles.colorOptionAdd,
                  { borderColor: colors.tabIconDefault },
                ]}
              >
                <FontAwesome name="plus" size={16} color={colors.tabIconDefault} />
              </Pressable>
            </View>

            <Modal
              visible={showColorPickerModal}
              transparent
              animationType="fade"
              onRequestClose={() => setShowColorPickerModal(false)}
            >
              <View style={styles.modalOverlay} pointerEvents="box-none">
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={() => setShowColorPickerModal(false)}
                />
                <View style={[styles.colorPickerModal, { backgroundColor: colors.theme.card }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {colorPickerMode === "add" ? "Nova cor personalizada" : "Editar cor"}
                  </Text>
                  <ColorPicker
                    value={colorPickerValue}
                    onChangeJS={(colorObj: { hex?: string }) => {
                      const h = colorObj?.hex;
                      if (typeof h === "string") {
                        const normalized = normalizeHex(h);
                        colorPickerValueRef.current = normalized;
                        setColorPickerValue(normalized);
                      }
                    }}
                    onCompleteJS={(colorObj: { hex?: string }) => {
                      const h = colorObj?.hex;
                      if (typeof h === "string") {
                        const normalized = normalizeHex(h);
                        colorPickerValueRef.current = normalized;
                        setColorPickerValue(normalized);
                      }
                    }}
                  >
                    <Panel1 style={styles.colorPickerPanel} />
                    <HueSlider style={styles.hueSlider} />
                  </ColorPicker>
                  <View style={styles.modalActions}>
                    <Pressable
                      onPress={() => setShowColorPickerModal(false)}
                      style={[styles.modalBtn, { backgroundColor: colors.tabIconDefault }]}
                    >
                      <Text style={styles.modalBtnText}>Cancelar</Text>
                    </Pressable>
                    <Pressable
                      onPress={applyColorFromPicker}
                      style={[styles.modalBtn, { backgroundColor: colors.incomeButton }]}
                    >
                      <Text style={styles.modalBtnText}>Usar esta cor</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Modal>
            <View style={styles.formActions}>
              <Pressable
                onPress={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setShowColorPickerModal(false);
                }}
                style={[styles.formBtn, { backgroundColor: colors.tabIconDefault }]}
              >
                <Text style={styles.formBtnText}>{pt.cancel}</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                style={[styles.formBtn, { backgroundColor: colors.incomeButton }]}
              >
                <Text style={styles.formBtnText}>{pt.save}</Text>
              </Pressable>
            </View>
          </View>
        )}
        </ScrollView>
      </TouchableWithoutFeedback>

      {!showForm && (
        <Pressable
          onPress={handleAdd}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: colors.tint },
            pressed && styles.pressed,
          ]}
        >
          <FontAwesome name="plus" size={24} color="#fff" />
        </Pressable>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === "ios" ? 120 : 100,
  },
  emptyText: {
    margin: 24,
    fontSize: 16,
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
  },
  pressed: {
    opacity: 0.8,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "600",
  },
  categoryLimit: {
    fontSize: 13,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 8,
  },
  form: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  colorPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 8,
  },
  colorOptionAdd: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  colorOptionEditable: {
    alignItems: "center",
    justifyContent: "center",
  },
  colorOptionWrapper: {
    position: "relative",
  },
  colorOptionDelete: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  modalBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  colorPickerModal: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  colorPickerPanel: {
    width: "100%",
    height: 200,
    marginBottom: 12,
  },
  hueSlider: {
    width: "100%",
    marginBottom: 12,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  colorOptionSelected: {
    borderWidth: 4,
  },
  formActions: {
    flexDirection: "row",
    gap: 12,
  },
  formBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  formBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
