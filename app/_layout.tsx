import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import LoginScreen from '@/app/login';
import FirstLaunchModal from '@/components/FirstLaunchModal';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { FabHeightProvider } from '@/context/FabHeightContext';
import { FabPositionProvider } from '@/context/FabPositionContext';
import { InitialHomeFilterProvider } from '@/context/InitialHomeFilterContext';
import { MonthProvider } from '@/context/MonthContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { ValuesVisibilityProvider } from '@/context/ValuesVisibilityContext';
import { initDatabase } from '@/database/init';
import { pt } from '@/locales/pt';
import { useThemeColors } from '@/hooks/useThemeColors';
import { isFirebaseConfigured } from '@/services/firebaseClient';
import {
  hasInitialSyncRun,
  initializeRemoteNotificationSync,
  runInitialExpenseSync,
  setInitialSyncDone,
} from '@/services/remoteNotificationSyncService';
import { getUpcomingExpensesForRemoteSync } from '@/services/transactionService';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading, biometricEnabled, isAuthenticated, hasSeenFirstLaunch } =
    useAuth();
  const { isDark } = useTheme();

  if (isLoading) return null;

  return (
    <>
      {biometricEnabled && !isAuthenticated ? (
        <>
          <StatusBar style={isDark ? 'light' : 'dark'} />
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
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <MonthProvider>
        <InitialHomeFilterProvider>
          <ToastProvider>
            <Stack
                screenOptions={{
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.text,
              }}
            >
              <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
              <Stack.Screen
                name='add-income'
                options={{ presentation: 'modal', title: 'Adicionar Entrada' }}
              />
              <Stack.Screen
                name='add-expense'
                options={{ presentation: 'modal', title: 'Adicionar Saída' }}
              />
              <Stack.Screen
                name='edit-transaction'
                options={{ presentation: 'modal', title: 'Editar Transação' }}
              />
              <Stack.Screen
                name='month-picker'
                options={{ presentation: 'modal', title: 'Selecionar mês' }}
              />
              <Stack.Screen
                name='add-fixed-expense'
                options={{ presentation: 'modal', title: 'Adicionar gasto fixo' }}
              />
              <Stack.Screen
                name='edit-fixed-expense'
                options={{ presentation: 'modal', title: 'Editar gasto fixo' }}
              />
              <Stack.Screen
                name='categories'
                options={{ title: pt.categories }}
              />
              <Stack.Screen
                name='bank-accounts'
                options={{ title: 'Contas bancárias' }}
              />
              <Stack.Screen
                name='add-bank-account'
                options={{ presentation: 'modal', title: 'Adicionar conta' }}
              />
              <Stack.Screen
                name='edit-bank-account'
                options={{ presentation: 'modal', title: 'Editar conta' }}
              />
            </Stack>
          </ToastProvider>
        </InitialHomeFilterProvider>
      </MonthProvider>
    </>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    console.log('initialize database');
    initDatabase();
    (async () => {
      try {
        await initializeRemoteNotificationSync();
        if (isFirebaseConfigured() && !(await hasInitialSyncRun())) {
          const payloads = getUpcomingExpensesForRemoteSync();
          console.log(
            'payloads carregados para sincronizacao inicial',
            payloads.length,
          );
          if (payloads.length > 0) {
            await runInitialExpenseSync(payloads);
          } else {
            await setInitialSyncDone();
          }
        }
      } catch (error) {
        console.error('Error initializing remote notification sync', error);
      }
    })();
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
        <FabPositionProvider>
          <FabHeightProvider>
            <ValuesVisibilityProvider>
            <AuthProvider>
            <AuthGate>
              <RootLayoutNav />
            </AuthGate>
          </AuthProvider>
            </ValuesVisibilityProvider>
          </FabHeightProvider>
        </FabPositionProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
