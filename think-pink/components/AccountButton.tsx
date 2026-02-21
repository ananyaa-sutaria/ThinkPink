import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../lib/AuthContext";

export default function AccountButton() {
  const router = useRouter();
  const { user } = useAuth();
  const displayName = user?.name?.trim() || "User";

  return (
    <Pressable
      onPress={() => router.push("/account")}
      style={{
        maxWidth: "52%",
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
        numberOfLines={1}
        ellipsizeMode="tail"
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        style={{
          color: "#fff",
          fontFamily: "Onest",
          fontWeight: "600",
          fontSize: 16,
          flexShrink: 1,
        }}
      >
        Hello, {displayName}!
      </Text>
    </Pressable>
  );
}
