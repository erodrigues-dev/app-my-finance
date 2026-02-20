import { addMonths, getMonth, getYear, startOfMonth, subMonths } from "date-fns";
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
  const now = startOfMonth(new Date());
  return { month: getMonth(now), year: getYear(now) };
}

export function MonthProvider({ children }: { children: React.ReactNode }) {
  const [selectedMonth, setSelectedMonth] = useState<MonthYear>(getCurrentMonthYear);

  const goToPreviousMonth = useCallback(() => {
    setSelectedMonth((prev) => {
      const d = new Date(prev.year, prev.month, 1);
      const prevMonth = subMonths(d, 1);
      return { month: getMonth(prevMonth), year: getYear(prevMonth) };
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setSelectedMonth((prev) => {
      const d = new Date(prev.year, prev.month, 1);
      const nextMonth = addMonths(d, 1);
      return { month: getMonth(nextMonth), year: getYear(nextMonth) };
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
