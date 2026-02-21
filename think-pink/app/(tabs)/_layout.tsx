import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Text } from "react-native";
import AccountButton from "../../components/AccountButton";
import { useProgress } from "../../lib/progressContext";

function HeaderRight() {
  const { points } = useProgress();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginRight: 8 }}>
      <View
        style={{
          backgroundColor: "#FFF",
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderWidth: 1,
          borderColor: "#F48FB1",
        }}
      >
        <Text style={{ color: "#D81B60", fontWeight: "800" }}>{points} pts</Text>
      </View>
      <AccountButton />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerTitle: "ThinkPink",
        headerRight: () => <HeaderRight />,
        tabBarActiveTintColor: "#D81B60",
        tabBarInactiveTintColor: "#777",
        tabBarStyle: { backgroundColor: "#FDECEF" },
        headerStyle: { backgroundColor: "#FDECEF" },
        headerTintColor: "#333",
        tabBarIcon: ({ color, size }) => {
          const name =
            route.name === "index"
              ? "home"
              : route.name === "log"
              ? "calendar"
              : route.name === "learn"
              ? "school"
              : route.name === "impact"
              ? "heart"
              : route.name === "rewards"
              ? "gift"
              : "ribbon";
          return <Ionicons name={name as any} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="learn" options={{ title: "Learn" }} />
      <Tabs.Screen name="impact" options={{ title: "Impact" }} />
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="log" options={{ title: "Log" }} />
      <Tabs.Screen name="badges" options={{ title: "Badges" }} />

      {/* add this once you create app/(tabs)/rewards.tsx */}
      <Tabs.Screen name="rewards" options={{ title: "Rewards" }} />
    </Tabs>
  );
}