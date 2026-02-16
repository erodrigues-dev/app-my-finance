import React from "react";
import { Pressable } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useValuesVisibility } from "@/context/ValuesVisibilityContext";

export function ValuesVisibilityButton() {
  const colors = useThemeColors();
  const { valuesVisible, toggleValuesVisibility } = useValuesVisibility();

  return (
    <Pressable
      onPress={toggleValuesVisibility}
      style={({ pressed }) => ({
        padding: 8,
        marginRight: 8,
        opacity: pressed ? 0.6 : 1,
      })}
      hitSlop={8}
    >
      <FontAwesome
        name={valuesVisible ? "eye" : "eye-slash"}
        size={22}
        color={colors.text}
      />
    </Pressable>
  );
}
