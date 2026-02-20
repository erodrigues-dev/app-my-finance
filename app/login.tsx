import FontAwesome from "@expo/vector-icons/FontAwesome";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  AppState,
  AppStateStatus,
} from "react-native";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useAuth } from "@/context/AuthContext";
import { pt } from "@/locales/pt";

export default function LoginScreen() {
  const colors = useThemeColors();
  const { authenticate, isBiometricAvailable } = useAuth();
  const [loading, setLoading] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web" || isBiometricAvailable !== true) return;

    const runAuth = () => {
      cancelledRef.current = false;
      setLoading(true);
      authenticate()
        .catch(() => {
          if (!cancelledRef.current) {
            Alert.alert(pt.biometricTitle, pt.biometricNotEnrolled);
          }
        })
        .finally(() => {
          if (!cancelledRef.current) setLoading(false);
        });
    };

    if (AppState.currentState === "active") {
      runAuth();
    }

    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          setLoading(false);
          runAuth();
        }
      }
    );

    return () => {
      cancelledRef.current = true;
      subscription.remove();
    };
  }, [authenticate, isBiometricAvailable]);

  const handleAuthenticate = async () => {
    if (Platform.OS === "web") {
      return;
    }
    if (isBiometricAvailable === false) {
      Alert.alert(
        pt.biometricTitle,
        pt.biometricNotAvailable
      );
      return;
    }

    setLoading(true);
    try {
      const success = await authenticate();
      if (!success) {
        // User cancelled or failed - no alert needed for cancel
      }
    } catch {
      Alert.alert(pt.biometricTitle, pt.biometricNotEnrolled);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.theme.card },
          ]}
        >
          <FontAwesome
            name={Platform.OS === "ios" ? "lock" : "hand-o-up"}
            size={64}
            color={colors.tint}
          />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          {pt.biometricTitle}
        </Text>
        <Text
          style={[styles.description, { color: colors.tabIconDefault }]}
        >
          {pt.biometricDescription}
        </Text>
        <Pressable
          onPress={handleAuthenticate}
          disabled={loading || isBiometricAvailable === false}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.tint },
            pressed && styles.buttonPressed,
            (loading || isBiometricAvailable === false) &&
              styles.buttonDisabled,
          ]}
        >
          <FontAwesome
            name={Platform.OS === "ios" ? "lock" : "hand-o-up"}
            size={20}
            color="#fff"
            style={styles.buttonIcon}
          />
          <Text style={styles.buttonText}>{pt.biometricUnlock}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 32,
    maxWidth: 320,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 240,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
