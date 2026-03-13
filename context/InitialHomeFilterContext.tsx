import React, { createContext, useCallback, useContext, useState } from "react";

export type InitialHomeFilter = {
  transactionType: "income" | "expense";
  categoryIds: number[];
};

type InitialHomeFilterContextType = {
  initialFilter: InitialHomeFilter | null;
  setInitialFilter: (filter: InitialHomeFilter | null) => void;
};

const InitialHomeFilterContext = createContext<InitialHomeFilterContextType | undefined>(undefined);

export function InitialHomeFilterProvider({ children }: { children: React.ReactNode }) {
  const [initialFilter, setInitialFilterState] = useState<InitialHomeFilter | null>(null);
  const setInitialFilter = useCallback((filter: InitialHomeFilter | null) => {
    setInitialFilterState(filter);
  }, []);
  return (
    <InitialHomeFilterContext.Provider value={{ initialFilter, setInitialFilter }}>
      {children}
    </InitialHomeFilterContext.Provider>
  );
}

export function useInitialHomeFilter() {
  const ctx = useContext(InitialHomeFilterContext);
  if (ctx === undefined) {
    throw new Error("useInitialHomeFilter must be used within InitialHomeFilterProvider");
  }
  return ctx;
}
