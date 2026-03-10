import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const FAB_POSITION_KEY = "@my_finance_fab_position";

export type FabPosition = "left" | "right";

type FabPositionContextType = {
  fabPosition: FabPosition;
  setFabPosition: (position: FabPosition) => Promise<void>;
};

const FabPositionContext =
  createContext<FabPositionContextType | undefined>(undefined);

export function FabPositionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [fabPosition, setFabPositionState] = useState<FabPosition>("right");

  useEffect(() => {
    AsyncStorage.getItem(FAB_POSITION_KEY).then((stored) => {
      if (stored === "left" || stored === "right") {
        setFabPositionState(stored);
      }
    });
  }, []);

  const setFabPosition = useCallback(async (position: FabPosition) => {
    setFabPositionState(position);
    await AsyncStorage.setItem(FAB_POSITION_KEY, position);
  }, []);

  return (
    <FabPositionContext.Provider value={{ fabPosition, setFabPosition }}>
      {children}
    </FabPositionContext.Provider>
  );
}

export function useFabPosition() {
  const context = useContext(FabPositionContext);
  if (!context) {
    throw new Error(
      "useFabPosition must be used within FabPositionProvider"
    );
  }
  return context;
}
