import React, { createContext, useCallback, useContext, useState } from "react";

type MonthYear = { month: number; year: number };

type MonthContextType = {
  selectedMonth: MonthYear;
  setSelectedMonth: (month: MonthYear) => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  goToCurrentMonth: () => void;
  canGoNext: boolean;
};

const MonthContext = createContext<MonthContextType | undefined>(undefined);

function getCurrentMonthYear(): MonthYear {
  const now = new Date();
  return { month: now.getMonth(), year: now.getFullYear() };
}

export function MonthProvider({ children }: { children: React.ReactNode }) {
  const [selectedMonth, setSelectedMonth] = useState<MonthYear>(getCurrentMonthYear);

  const goToPreviousMonth = useCallback(() => {
    setSelectedMonth((prev) => {
      if (prev.month === 0) {
        return { month: 11, year: prev.year - 1 };
      }
      return { month: prev.month - 1, year: prev.year };
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setSelectedMonth((prev) => {
      if (prev.month === 11) {
        return { month: 0, year: prev.year + 1 };
      }
      return { month: prev.month + 1, year: prev.year };
    });
  }, []);

  const goToCurrentMonth = useCallback(() => {
    setSelectedMonth(getCurrentMonthYear());
  }, []);

  const canGoNext = true;

  return (
    <MonthContext.Provider
      value={{
        selectedMonth,
        setSelectedMonth,
        goToPreviousMonth,
        goToNextMonth,
        goToCurrentMonth,
        canGoNext,
      }}
    >
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth() {
  const context = useContext(MonthContext);
  if (!context) {
    throw new Error("useMonth must be used within MonthProvider");
  }
  return context;
}
