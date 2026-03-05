import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";

const BIOMETRIC_ENABLED_KEY = "@my_finance_biometric_enabled";
const HAS_SEEN_FIRST_LAUNCH_KEY = "@my_finance_has_seen_first_launch";

type AuthContextType = {
  biometricEnabled: boolean;
  isAuthenticated: boolean;
  hasSeenFirstLaunch: boolean;
  isLoading: boolean;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  authenticate: () => Promise<boolean>;
  markFirstLaunchSeen: () => Promise<void>;
  isBiometricAvailable: boolean | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const INACTIVITY_TIMEOUT_MS = 120 * 1000;

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [hasSeenFirstLaunch, setHasSeenFirstLaunch] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState<
    boolean | null
  >(null);
  const lastBackgroundTimeRef = useRef<number | null>(null);

  const loadStoredState = useCallback(async () => {
    try {
      const [enabled, seen] = await Promise.all([
        AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY),
        AsyncStorage.getItem(HAS_SEEN_FIRST_LAUNCH_KEY),
      ]);
      const enabledBool = enabled === "true";
      const seenBool = seen === "true";

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const available = hasHardware && isEnrolled;

      setIsBiometricAvailable(available);
      setHasSeenFirstLaunch(seenBool);
      setBiometricEnabled(enabledBool && available);

      if (enabledBool && available) {
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
      }
    } catch {
      setBiometricEnabled(false);
      setHasSeenFirstLaunch(true);
      setIsAuthenticated(true);
      setIsBiometricAvailable(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStoredState();
  }, [loadStoredState]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "background") {
        lastBackgroundTimeRef.current = Date.now();
      } else if (nextState === "active" && biometricEnabled) {
        const lastBackgroundTime = lastBackgroundTimeRef.current;
        if (lastBackgroundTime != null) {
          const inactiveFor = Date.now() - lastBackgroundTime;
          if (inactiveFor >= INACTIVITY_TIMEOUT_MS) {
            setIsAuthenticated(false);
          }
        }
        lastBackgroundTimeRef.current = null;
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription.remove();
  }, [biometricEnabled]);

  const authenticate = useCallback(async (): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Desbloquear app",
        fallbackLabel: "Usar senha do dispositivo",
      });
      if (result.success) {
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const enableBiometric = useCallback(async (): Promise<boolean> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) return false;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Verificar biometria",
        fallbackLabel: "Usar senha do dispositivo",
      });

      if (result.success) {
        await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, "true");
        setBiometricEnabled(true);
        setIsAuthenticated(false);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const disableBiometric = useCallback(async () => {
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, "false");
    setBiometricEnabled(false);
    setIsAuthenticated(true);
  }, []);

  const markFirstLaunchSeen = useCallback(async () => {
    await AsyncStorage.setItem(HAS_SEEN_FIRST_LAUNCH_KEY, "true");
    setHasSeenFirstLaunch(true);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        biometricEnabled,
        isAuthenticated,
        hasSeenFirstLaunch,
        isLoading,
        enableBiometric,
        disableBiometric,
        authenticate,
        markFirstLaunchSeen,
        isBiometricAvailable,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
