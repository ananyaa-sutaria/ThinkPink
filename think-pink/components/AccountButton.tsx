import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../lib/AuthContext"; // adjust path if needed
//import { useProgress } from "../lib/progressContext"; // import your user context

export default function AccountButton() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <Pressable
      onPress={() => router.push("/account")}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: "#C7547F", // match header background
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