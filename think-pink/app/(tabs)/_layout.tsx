import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AccountButton from "../../components/AccountButton";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerTitle: "ThinkPink",
        headerRight: () => <AccountButton />,
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
              : "ribbon";
          return <Ionicons name={name as any} size={size} color={color} />;
        },
      })}
    >
      
      <Tabs.Screen name="learn" options={{ title: "Learn" }}/>
      <Tabs.Screen name="impact" options={{ title: "Impact" }} />
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="log" options={{ title: "Log" }} />      
      <Tabs.Screen name="badges" options={{ title: "Badges" }} />
    </Tabs>
  );
}