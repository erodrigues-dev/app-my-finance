import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const FAB_HEIGHT_KEY = "@my_finance_fab_height";

export type FabHeight = "bottom" | "mid" | "up";

type FabHeightContextType = {
  fabHeight: FabHeight;
  setFabHeight: (height: FabHeight) => Promise<void>;
};

const FabHeightContext =
  createContext<FabHeightContextType | undefined>(undefined);

const VALID_HEIGHTS: FabHeight[] = ["bottom", "mid", "up"];

export function FabHeightProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [fabHeight, setFabHeightState] = useState<FabHeight>("bottom");

  useEffect(() => {
    AsyncStorage.getItem(FAB_HEIGHT_KEY).then((stored) => {
      if (stored === "quarter") setFabHeightState("mid");
      else if (stored === "middle") setFabHeightState("up");
      else if (VALID_HEIGHTS.includes(stored as FabHeight)) {
        setFabHeightState(stored as FabHeight);
      }
    });
  }, []);

  const setFabHeight = useCallback(async (height: FabHeight) => {
    setFabHeightState(height);
    await AsyncStorage.setItem(FAB_HEIGHT_KEY, height);
  }, []);

  return (
    <FabHeightContext.Provider value={{ fabHeight, setFabHeight }}>
      {children}
    </FabHeightContext.Provider>
  );
}

export function useFabHeight() {
  const context = useContext(FabHeightContext);
  if (!context) {
    throw new Error(
      "useFabHeight must be used within FabHeightProvider"
    );
  }
  return context;
}
