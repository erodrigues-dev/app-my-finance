import { colors, darkTheme, lightTheme } from "@/theme";

export default {
  light: {
    text: lightTheme.foreground,
    background: lightTheme.background,
    tint: lightTheme.accent,
    tabIconDefault: lightTheme.muted,
    tabIconSelected: lightTheme.accent,
    income: lightTheme.income,
    expense: lightTheme.expense,
    incomeButton: lightTheme.incomeButton,
    expenseButton: lightTheme.expenseButton,
    card: lightTheme.card,
  },
  dark: {
    text: darkTheme.foreground,
    background: darkTheme.background,
    tint: darkTheme.accent,
    tabIconDefault: darkTheme.muted,
    tabIconSelected: darkTheme.accent,
    income: darkTheme.income,
    expense: darkTheme.expense,
    incomeButton: darkTheme.incomeButton,
    expenseButton: darkTheme.expenseButton,
    card: darkTheme.card,
  },
};

export { colors, darkTheme, lightTheme };
