import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Switch,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useTheme } from "@/context/ThemeContext";
import { shareBackup, restoreBackup } from "@/services/exportService";
import { useAuth } from "@/context/AuthContext";
import { pt } from "@/locales/pt";

export default function SettingsScreen() {
  const colors = useThemeColors();
  const { themeMode, setThemeMode } = useTheme();
  const {
    biometricEnabled,
    enableBiometric,
    disableBiometric,
    isBiometricAvailable,
  } = useAuth();
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  const handleBiometricToggle = async (value: boolean) => {
    setBiometricLoading(true);
    try {
      if (value) {
        const success = await enableBiometric();
        if (!success) {
          Alert.alert(
            pt.biometricTitle,
            isBiometricAvailable === false
              ? pt.biometricNotAvailable
              : pt.biometricNotEnrolled
          );
        }
      } else {
        await disableBiometric();
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleBackup = async () => {
    try {
      await shareBackup();
      Alert.alert("Sucesso", pt.backupSuccess);
    } catch (e) {
      Alert.alert("Erro", "Não foi possível criar o backup.");
    }
  };

  const handleRestore = () => {
    Alert.alert(
      "Restaurar backup",
      pt.confirmRestore,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Restaurar",
          onPress: async () => {
            setLoading(true);
            try {
              const result = await DocumentPicker.getDocumentAsync({
                type: "application/json",
                copyToCacheDirectory: true,
              });
              if (result.canceled) {
                setLoading(false);
                return;
              }
              const content = await FileSystem.readAsStringAsync(
                result.assets[0].uri
              );
              await restoreBackup(content);
              Alert.alert("Sucesso", pt.restoreSuccess);
            } catch (e) {
              Alert.alert("Erro", "Não foi possível restaurar o backup.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {pt.theme}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.theme.card }]}>
          {[
            { value: "system" as const, label: pt.followSystem },
            { value: "light" as const, label: pt.light },
            { value: "dark" as const, label: pt.dark },
          ].map(({ value, label }) => (
            <Pressable
              key={value}
              onPress={() => setThemeMode(value)}
              style={[
                styles.optionRow,
                themeMode === value && {
                  backgroundColor: colors.tint + "30",
                },
              ]}
            >
              <Text style={[styles.optionLabel, { color: colors.text }]}>
                {label}
              </Text>
              {themeMode === value && (
                <FontAwesome name="check" size={18} color={colors.tint} />
              )}
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {pt.settingsSecurity}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.theme.card }]}>
          <View style={styles.optionRow}>
            <FontAwesome name="lock" size={20} color={colors.tint} />
            <View style={styles.optionContent}>
              <Text style={[styles.optionLabel, { color: colors.text }]}>
                {pt.settingsBiometricLock}
              </Text>
              <Text style={[styles.optionDesc, { color: colors.tabIconDefault }]}>
                {pt.settingsBiometricLockDesc}
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              disabled={biometricLoading || isBiometricAvailable === false}
              trackColor={{ false: colors.tabIconDefault + "60", true: colors.tint + "80" }}
              thumbColor={biometricEnabled ? colors.tint : "#f4f3f4"}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Dados
        </Text>
        <View style={[styles.card, { backgroundColor: colors.theme.card }]}>
          <Pressable
            onPress={handleBackup}
            disabled={loading}
            style={({ pressed }) => [
              styles.optionRow,
              pressed && styles.pressed,
            ]}
          >
            <FontAwesome name="download" size={20} color={colors.tint} />
            <View style={styles.optionContent}>
              <Text style={[styles.optionLabel, { color: colors.text }]}>
                {pt.backup}
              </Text>
              <Text style={[styles.optionDesc, { color: colors.tabIconDefault }]}>
                {pt.backupDescription}
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={handleRestore}
            disabled={loading}
            style={({ pressed }) => [
              styles.optionRow,
              pressed && styles.pressed,
            ]}
          >
            <FontAwesome name="upload" size={20} color={colors.tint} />
            <View style={styles.optionContent}>
              <Text style={[styles.optionLabel, { color: colors.text }]}>
                {pt.restore}
              </Text>
              <Text style={[styles.optionDesc, { color: colors.tabIconDefault }]}>
                {pt.restoreDescription}
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  optionDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.8,
  },
});
