import { StyleSheet, useWindowDimensions, type ViewStyle } from "react-native";
import { useFabHeight } from "@/context/FabHeightContext";
import { useFabPosition } from "@/context/FabPositionContext";

/** Altura aproximada do tab bar; usado em telas sem abas (ex.: Categorias) para alinhar o FAB à mesma altura visual. */
const TAB_BAR_HEIGHT = 72;

export const fabStyles = StyleSheet.create({
  fabContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    justifyContent: "flex-end",
    alignItems: "flex-end",
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  fabBackdrop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  fabMenu: {
    alignItems: "flex-end",
    gap: 16,
  },
  fabActionsWrap: {
    width: 56,
    alignItems: "center",
  },
  fabActionCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabMain: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});

/**
 * Estilo do container do FAB.
ao  * A altura é calculada como fração da área visível: 1/8, 2/8 ou 3/8 a partir da borda inferior.
 * Em telas com tab bar a área visível = windowHeight - TAB_BAR_HEIGHT; em Categorias = windowHeight.
 * @param options.noTabBar - Se true (ex.: tela Categorias), a área visível é a tela inteira.
 */
export function useFabContainerStyle(options?: { noTabBar?: boolean }): ViewStyle[] {
  const { height: windowHeight } = useWindowDimensions();
  const { fabPosition } = useFabPosition();
  const { fabHeight } = useFabHeight();
  const visibleHeight = options?.noTabBar ? windowHeight : windowHeight - TAB_BAR_HEIGHT;

  const paddingBottom = (() => {
    switch (fabHeight) {
      case "up":
        return visibleHeight * (3 / 8);
      case "mid":
        return visibleHeight * (2 / 8);
      case "bottom":
      default:
        return visibleHeight * (1 / 8);
    }
  })();

  return [
    fabStyles.fabContainer,
    {
      paddingBottom,
      alignItems: fabPosition === "right" ? "flex-end" : "flex-start",
    },
  ];
}
