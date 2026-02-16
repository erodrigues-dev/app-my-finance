import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useAuth } from "@/context/AuthContext";
import { pt } from "@/locales/pt";

export default function FirstLaunchModal() {
  const colors = useThemeColors();
  const {
    hasSeenFirstLaunch,
    enableBiometric,
    markFirstLaunchSeen,
    isBiometricAvailable,
  } = useAuth();
  const [loading, setLoading] = useState(false);

  if (hasSeenFirstLaunch) return null;

  const handleActivate = async () => {
    if (Platform.OS === "web") {
      await markFirstLaunchSeen();
      return;
    }
    if (isBiometricAvailable === false) {
      Alert.alert(
        pt.biometricTitle,
        pt.biometricNotAvailable,
        [{ text: "OK", onPress: markFirstLaunchSeen }]
      );
      return;
    }

    setLoading(true);
    try {
      const success = await enableBiometric();
      if (success) {
        await markFirstLaunchSeen();
      } else {
        await markFirstLaunchSeen();
      }
    } catch {
      await markFirstLaunchSeen();
    } finally {
      setLoading(false);
    }
  };

  const handleLater = async () => {
    await markFirstLaunchSeen();
  };

  return (
    <Modal
      visible={!hasSeenFirstLaunch}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View
          style={[styles.modal, { backgroundColor: colors.theme.card }]}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            {pt.firstLaunchBiometricTitle}
          </Text>
          <Text
            style={[styles.message, { color: colors.tabIconDefault }]}
          >
            {pt.firstLaunchBiometricMessage}
          </Text>
          <View style={styles.buttons}>
            <Pressable
              onPress={handleLater}
              disabled={loading}
              style={({ pressed }) => [
                styles.buttonSecondary,
                { borderColor: colors.tint },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.buttonSecondaryText, { color: colors.tint }]}>
                {pt.firstLaunchLater}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleActivate}
              disabled={loading}
              style={({ pressed }) => [
                styles.buttonPrimary,
                { backgroundColor: colors.tint },
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.buttonPrimaryText}>
                {pt.firstLaunchActivate}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modal: {
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 340,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  buttons: {
    gap: 12,
  },
  buttonPrimary: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonSecondary: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
  },
  buttonPrimaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonSecondaryText: {
    fontSize: 16,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.8,
  },
});
