import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { getWalletAddress } from "../lib/walletStore";

export default function AccountScreen() {
  const router = useRouter();
  const [wallet, setWallet] = useState<string>("");

  useEffect(() => {
    getWalletAddress().then((w) => setWallet(w || ""));
  }, []);

  const shortWallet =
    wallet.length > 8
      ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}`
      : wallet;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#FDECEF",
        padding: 16,
        gap: 16,
      }}
    >
      {/* Header */}
      <View
        style={{
          backgroundColor: "#FFF",
          borderRadius: 24,
          padding: 20,
          gap: 12,
          elevation: 4,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: "800", color: "#333" }}>
          Account
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="shield-checkmark" size={16} color="#D81B60" />
          <Text style={{ color: "#D81B60", fontWeight: "700" }}>
            Solana Devnet
          </Text>
        </View>
      </View>

      {/* Wallet Card */}
      <View
        style={{
          backgroundColor: "#FFF",
          borderRadius: 24,
          padding: 20,
          gap: 10,
          elevation: 4,
        }}
      >
        <Text style={{ fontWeight: "800", fontSize: 16, color: "#333" }}>
          Wallet
        </Text>

        {wallet ? (
          <>
            <Text style={{ color: "#555" }}>{shortWallet}</Text>

            <Pressable
              onPress={() => Clipboard.setStringAsync(wallet)}
              style={{
                marginTop: 8,
                backgroundColor: "#FDECEF",
                borderRadius: 999,
                paddingVertical: 10,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Ionicons name="copy-outline" size={16} color="#D81B60" />
              <Text style={{ color: "#D81B60", fontWeight: "700" }}>
                Copy Address
              </Text>
            </Pressable>
          </>
        ) : (
          <Text style={{ color: "#C62828" }}>
            No wallet connected.
          </Text>
        )}
      </View>

      {/* Back Button */}
      <Pressable
        onPress={() => router.back()}
        style={{
          marginTop: "auto",
          backgroundColor: "#D81B60",
          borderRadius: 999,
          paddingVertical: 14,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: 8,
          elevation: 4,
        }}
      >
        <Ionicons name="arrow-back" size={18} color="#FFF" />
        <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 16 }}>
          Back to Home
        </Text>
      </Pressable>
    </View>
  );
}