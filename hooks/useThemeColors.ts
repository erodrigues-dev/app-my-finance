import Colors, { darkTheme, lightTheme } from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";

export function useThemeColors() {
  const { isDark } = useTheme();
  const scheme = isDark ? "dark" : "light";
  return {
    ...Colors[scheme],
    theme: isDark ? darkTheme : lightTheme,
    isDark,
  };
}
