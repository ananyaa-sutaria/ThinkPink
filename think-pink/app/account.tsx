import { View, Text, TextInput, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";

export default function AccountScreen() {
  const router = useRouter();
  const [name, setName] = useState("Anyaa");
  const [wallet, setWallet] = useState("");

  return (
    <View style={{ flex: 1, backgroundColor: "#FDECEF", padding: 16, gap: 12 }}>
      <View style={{ backgroundColor: "#FFF", borderRadius: 20, padding: 16, gap: 6 }}>
        <Text style={{ color: "#333", fontSize: 18, fontWeight: "800" }}>Account</Text>
        <Text style={{ color: "#555" }}>Edit profile + settings</Text>
      </View>

      <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" />
      <Field label="Solana wallet (devnet)" value={wallet} onChangeText={setWallet} placeholder="Paste address (optional for now)" />

      <Pressable
        onPress={() => router.back()}
        style={{ backgroundColor: "#D81B60", borderRadius: 999, paddingVertical: 12, alignItems: "center" }}
      >
        <Text style={{ color: "#FFF", fontWeight: "700" }}>Done</Text>
      </Pressable>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
}) {
  return (
    <View style={{ backgroundColor: "#FFF", borderRadius: 20, padding: 16, gap: 8 }}>
      <Text style={{ color: "#333", fontWeight: "800" }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#999"
        style={{ borderWidth: 1, borderColor: "#F48FB1", borderRadius: 16, padding: 12, color: "#333" }}
      />
    </View>
  );
}