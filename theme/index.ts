// Dracula color palette
export const colors = {
  dracula: {
    background: "#282A36",
    foreground: "#F8F8F2",
    selection: "#44475A",
    comment: "#6272A4",
    red: "#FF5555",
    orange: "#FFB86C",
    yellow: "#F1FA8C",
    green: "#50FA7B",
    purple: "#BD93F9",
    pink: "#FF79C6",
    cyan: "#8BE9FD",
  },
} as const;

// Darker variants for buttons (better contrast with white text)
const INCOME_BUTTON = "#1B8E3B";
const EXPENSE_BUTTON = "#CC3333";

// Light mode (Dracula-inspired variant)
export const lightTheme = {
  background: "#F8F8F2",
  card: "#FFFFFF",
  foreground: "#282A36",
  muted: "#6272A4",
  income: colors.dracula.green,
  expense: colors.dracula.red,
  incomeButton: INCOME_BUTTON,
  expenseButton: EXPENSE_BUTTON,
  accent: colors.dracula.purple,
  warning: colors.dracula.orange,
};

// Dark mode (full Dracula)
export const darkTheme = {
  background: colors.dracula.background,
  card: colors.dracula.selection,
  foreground: colors.dracula.foreground,
  muted: colors.dracula.comment,
  income: colors.dracula.green,
  expense: colors.dracula.red,
  incomeButton: INCOME_BUTTON,
  expenseButton: EXPENSE_BUTTON,
  accent: colors.dracula.purple,
  warning: colors.dracula.orange,
};

export const categoryColors = [
  colors.dracula.purple,
  colors.dracula.cyan,
  colors.dracula.orange,
  colors.dracula.pink,
  colors.dracula.green,
];
