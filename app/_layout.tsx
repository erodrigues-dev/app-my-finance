import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { ValuesVisibilityProvider } from "@/context/ValuesVisibilityContext";
import { useThemeColors } from "@/hooks/useThemeColors";
import { MonthProvider } from "@/context/MonthContext";
import { initDatabase } from "@/database/init";
import FirstLaunchModal from "@/components/FirstLaunchModal";
import LoginScreen from "@/app/login";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const {
    isLoading,
    biometricEnabled,
    isAuthenticated,
    hasSeenFirstLaunch,
  } = useAuth();
  const { isDark } = useTheme();

  if (isLoading) return null;

  return (
    <>
      {biometricEnabled && !isAuthenticated ? (
        <>
          <StatusBar style={isDark ? "light" : "dark"} />
          <LoginScreen />
        </>
      ) : (
        children
      )}
      {!hasSeenFirstLaunch && <FirstLaunchModal />}
    </>
  );
}

function RootLayoutNav() {
  const { isDark } = useTheme();
  const colors = useThemeColors();

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <MonthProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="add-income"
            options={{ presentation: "modal", title: "Adicionar Entrada" }}
          />
          <Stack.Screen
            name="add-expense"
            options={{ presentation: "modal", title: "Adicionar Saída" }}
          />
          <Stack.Screen
            name="edit-transaction"
            options={{ presentation: "modal", title: "Editar Transação" }}
          />
          <Stack.Screen
            name="month-picker"
            options={{ presentation: "modal", title: "Selecionar mês" }}
          />
          <Stack.Screen
            name="add-fixed-expense"
            options={{ presentation: "modal", title: "Adicionar gasto fixo" }}
          />
          <Stack.Screen
            name="edit-fixed-expense"
            options={{ presentation: "modal", title: "Editar gasto fixo" }}
          />
        </Stack>
      </MonthProvider>
    </>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  useEffect(() => {
    initDatabase();
  }, []);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ValuesVisibilityProvider>
          <AuthProvider>
            <AuthGate>
              <RootLayoutNav />
            </AuthGate>
          </AuthProvider>
        </ValuesVisibilityProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
