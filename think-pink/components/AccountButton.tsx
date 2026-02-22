import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../lib/AuthContext";

export default function AccountButton() {
  const router = useRouter();
  const { user } = useAuth();

  // Decide where to go based on login state
  const handlePress = () => {
    if (user) {
      router.push("/account"); // signed-in → account page
    } else {
      router.push("/login");   // guest → login page
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: "#C7547F",
        elevation: 5,
      }}
      accessibilityRole="button"
      accessibilityLabel="Open account"
    >
      <Text
        style={{
          color: "#fff",
          fontFamily: "Onest",
          fontWeight: "600",
          fontSize: 16,
          
        }}
      >
        Hello, {user?.name || "Guest"}!
      </Text>
    </Pressable>
  );
}