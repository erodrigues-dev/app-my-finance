import React from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ValuesVisibilityButton } from "@/components/ValuesVisibilityButton";
import { pt } from "@/locales/pt";

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colors = useThemeColors();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tabIconSelected,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: { backgroundColor: colors.theme.card },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerRight: () => <ValuesVisibilityButton />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: pt.appName,
          tabBarLabel: pt.home,
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="charts"
        options={{
          title: pt.charts,
          tabBarIcon: ({ color }) => <TabBarIcon name="bar-chart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="fixed-expenses"
        options={{
          title: pt.fixedExpenses,
          tabBarLabel: pt.fixedExpenses,
          tabBarIcon: ({ color }) => <TabBarIcon name="repeat" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: pt.settings,
          tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
        }}
      />
    </Tabs>
  );
}
