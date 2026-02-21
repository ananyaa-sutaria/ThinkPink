import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { getWalletAddress, setWalletAddress } from "../lib/walletStore";

export default function Account() {
  const [wallet, setWallet] = useState("");

  useEffect(() => {
    getWalletAddress().then((w) => setWallet(w || ""));
  }, []);

  async function save() {
    await setWalletAddress(wallet.trim());
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12, backgroundColor: "#FDECEF" }}>
      <View style={{ backgroundColor: "#FFF", padding: 16, borderRadius: 20, gap: 8 }}>
        <Text style={{ color: "#333", fontWeight: "800", fontSize: 18 }}>Account</Text>
        <Text style={{ color: "#555" }}>Solana wallet (devnet)</Text>

        <TextInput
          value={wallet}
          onChangeText={setWallet}
          placeholder="Paste your Solana address"
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            borderWidth: 1,
            borderColor: "#F48FB1",
            borderRadius: 14,
            padding: 12,
            backgroundColor: "#FFF",
            color: "#333",
          }}
        />

        <Pressable
          onPress={save}
          style={{
            backgroundColor: "#D81B60",
            borderRadius: 999,
            paddingVertical: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#FFF", fontWeight: "700" }}>Save wallet</Text>
        </Pressable>
      </View>
    </View>
  );
}