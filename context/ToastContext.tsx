import { pt } from "@/locales/pt";
import { getMonthNameKey } from "@/utils/dateUtils";
import { useMonth } from "@/context/MonthContext";
import { useRouter } from "expo-router";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "@/hooks/useThemeColors";

type ViewMonth = { month: number; year: number };

type ToastState = {
  message: string;
  viewMonth: ViewMonth | null;
};

type ToastContextType = {
  showToast: (opts: { message: string; viewMonth?: ViewMonth }) => void;
  hideToast: () => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { setSelectedMonth } = useMonth();
  const router = useRouter();

  const hideToast = useCallback(() => setToast(null), []);

  const showToast = useCallback((opts: { message: string; viewMonth?: ViewMonth }) => {
    setToast({ message: opts.message, viewMonth: opts.viewMonth ?? null });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(hideToast, 5000);
    return () => clearTimeout(t);
  }, [toast, hideToast]);

  const onViewPress = useCallback(() => {
    if (!toast?.viewMonth) return;
    setSelectedMonth({ month: toast.viewMonth.month, year: toast.viewMonth.year });
    hideToast();
    router.replace("/(tabs)");
  }, [toast?.viewMonth, setSelectedMonth, hideToast, router]);

  const monthLabel = toast?.viewMonth
    ? pt[getMonthNameKey(toast.viewMonth.month)]
    : "";

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      <View style={styles.wrapper}>
      {children}
      {toast && (
        <View
          style={[
            styles.snackbar,
            {
              backgroundColor: colors.background,
              marginBottom: insets.bottom + 16,
            },
          ]}
        >
          <Text style={[styles.message, { color: colors.text }]} numberOfLines={2}>
            {toast.message} {monthLabel}
          </Text>
          {toast.viewMonth && (
            <Pressable
              onPress={onViewPress}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
              hitSlop={8}
            >
              <Text style={[styles.actionText, { color: colors.tint }]}>{pt.viewMonth}</Text>
            </Pressable>
          )}
        </View>
      )}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  snackbar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 4,
    minHeight: 48,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  message: {
    flex: 1,
    fontSize: 14,
    marginRight: 12,
  },
  action: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  pressed: {
    opacity: 0.8,
  },
});
