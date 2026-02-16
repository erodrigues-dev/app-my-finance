import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const VALUES_VISIBILITY_KEY = "@my_finance_values_visible";

type ValuesVisibilityContextType = {
  valuesVisible: boolean;
  toggleValuesVisibility: () => void;
  formatCurrency: (value: number) => string;
};

const ValuesVisibilityContext =
  createContext<ValuesVisibilityContextType | undefined>(undefined);

export function ValuesVisibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [valuesVisible, setValuesVisible] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(VALUES_VISIBILITY_KEY).then((stored) => {
      setValuesVisible(stored !== "false");
    });
  }, []);

  const toggleValuesVisibility = useCallback(async () => {
    setValuesVisible((prev) => {
      const next = !prev;
      AsyncStorage.setItem(VALUES_VISIBILITY_KEY, String(next));
      return next;
    });
  }, []);

  const formatCurrency = useCallback(
    (value: number) => {
      if (!valuesVisible) return "••••••";
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(value);
    },
    [valuesVisible]
  );

  return (
    <ValuesVisibilityContext.Provider
      value={{ valuesVisible, toggleValuesVisibility, formatCurrency }}
    >
      {children}
    </ValuesVisibilityContext.Provider>
  );
}

export function useValuesVisibility() {
  const context = useContext(ValuesVisibilityContext);
  if (!context) {
    throw new Error(
      "useValuesVisibility must be used within ValuesVisibilityProvider"
    );
  }
  return context;
}
