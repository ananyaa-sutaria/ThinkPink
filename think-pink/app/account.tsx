import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { getWalletAddress, setWalletAddress } from "../lib/walletStore";
import { useAuth } from "../lib/AuthContext";

export default function AccountScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth?.() || ({} as any);

  const [username, setUsername] = useState<string>(user?.name || "");
  const [wallet, setWallet] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  useEffect(() => {
    getWalletAddress().then((w) => setWallet(w || user?.wallet || ""));
  }, [user?.wallet]);

  const shortWallet = useMemo(() => {
    if (!wallet) return "";
    return wallet.length > 8 ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}` : wallet;
  }, [wallet]);

  async function onSaveLocal() {
    await setWalletAddress(wallet.trim());
    Alert.alert("Saved", "Saved wallet locally ✅");
  }

  async function onCopy() {
    if (!wallet) return;
    await Clipboard.setStringAsync(wallet);
    Alert.alert("Copied", "Wallet address copied ✅");
  }

  async function onSignOut() {
    try {
      if (signOut) signOut();
      router.replace("/login" as any);
    } catch (e) {
      console.log(e);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Account Settings</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Username</Text>
        <TextInput style={styles.input} value={username} onChangeText={setUsername} />

        <Text style={[styles.label, { marginTop: 15 }]}>Update Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      <View style={styles.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={styles.label}>Solana Wallet</Text>
          <Text style={{ color: "#D81B60", fontSize: 12, fontWeight: "700" }}>Devnet</Text>
        </View>

        <Text style={styles.subLabel}>Paste your Phantom / Solflare wallet address:</Text>
        <TextInput
          style={styles.input}
          placeholder="Your wallet address (base58)"
          autoCapitalize="none"
          autoCorrect={false}
          value={wallet}
          onChangeText={setWallet}
        />

        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <Pressable onPress={onSaveLocal} style={[styles.smallBtn, { backgroundColor: "#D81B60" }]}>
            <Text style={[styles.smallBtnText, { color: "#FFF" }]}>Save</Text>
          </Pressable>

          <Pressable
            onPress={onCopy}
            disabled={!wallet}
            style={[styles.smallBtn, { backgroundColor: wallet ? "#FDECEF" : "#F48FB1" }]}
          >
            <Ionicons name="copy-outline" size={14} color="#D81B60" />
            <Text style={[styles.smallBtnText, { color: "#D81B60" }]}>
              {wallet ? `Copy (${shortWallet})` : "Copy"}
            </Text>
          </Pressable>
        </View>
      </View>

      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={16} color="#D81B60" />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <Pressable onPress={onSignOut} style={styles.signOutButton}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDECEF", padding: 20 },
  header: { fontSize: 24, fontWeight: "900", color: "#D81B60", marginBottom: 20 },

  card: { backgroundColor: "#FFF", borderRadius: 15, padding: 15, marginBottom: 15 },
  label: { fontWeight: "700", marginBottom: 6, color: "#333" },
  subLabel: { color: "#555", marginBottom: 8 },

  input: {
    borderWidth: 1,
    borderColor: "#F48FB1",
    borderRadius: 10,
    padding: 12,
    color: "#000",
    backgroundColor: "#FFF",
  },

  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  smallBtnText: { fontWeight: "700" },

  signOutButton: { marginTop: 10, padding: 10, alignItems: "center" },
  signOutText: { color: "#D81B60", fontWeight: "800", fontSize: 16 },

  backButton: {
    marginTop: "auto",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
  },
  backText: { color: "#D81B60", fontWeight: "800" },
});
