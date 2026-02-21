import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router";

export default function AccountButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push("/account")}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginRight: 8,
        borderRadius: 999,
        backgroundColor: "#FFFFFF",
      }}
      accessibilityRole="button"
      accessibilityLabel="Open account"
    >
      <Text style={{ color: "#D81B60", fontWeight: "600" }}>Hello</Text>
    </Pressable>
  );
}