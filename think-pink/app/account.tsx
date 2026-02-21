import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { getWalletAddress, setWalletAddress } from "../lib/walletStore";
import { API_BASE } from "../lib/api";

export default function AccountScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [username, setUsername] = useState<string>(user?.name || "");
  const [wallet, setWallet] = useState<string>(user?.wallet || "");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!wallet) getWalletAddress().then((w) => setWallet(w || ""));
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await setWalletAddress(wallet.trim());

      const response = await fetch(`${API_BASE}/api/users/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.userId, name: username, wallet: wallet.trim(), password }),
      });

      const contentType = response.headers.get("content-type") || "";
      let data: any;

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.warn("Server returned non-JSON:", text);
        alert("Server returned unexpected response. Check backend URL!");
        return;
      }

      if (response.ok) {
        alert("Changes saved ✅");
        router.back();
      } else {
        alert(data.error || "Save failed");
      }
    } catch (error) {
      console.error(error);
      alert("Could not connect to server. Check your backend terminal!");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    try {
      signOut();
      router.replace("/login" as any);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const shortWallet = wallet.length > 8 ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}` : wallet;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Account Settings</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Username</Text>
        <TextInput style={styles.input} value={username} onChangeText={setUsername} />

        <Text style={[styles.label, { marginTop: 15 }]}>Update Password</Text>
        <TextInput style={styles.input} placeholder="••••••••" secureTextEntry value={password} onChangeText={setPassword} />
      </View>

      <View style={styles.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={styles.label}>Solana Wallet</Text>
          <Text style={{ color: "#D81B60", fontSize: 12, fontWeight: "700" }}>Devnet</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Paste your Solana wallet address"
          autoCapitalize="none"
          autoCorrect={false}
          value={wallet}
          onChangeText={setWallet}
        />

        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <Pressable
            onPress={async () => {
              const clip = await Clipboard.getStringAsync();
              if (clip) setWallet(clip.trim());
            }}
            style={{ backgroundColor: "#FDECEF", borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14 }}
          >
            <Text style={{ color: "#333", fontWeight: "700" }}>Paste</Text>
          </Pressable>

          <Pressable
            onPress={async () => {
              if (!wallet.trim()) {
                alert("Paste a wallet address first.");
                return;
              }
              await setWalletAddress(wallet.trim());
              alert("Saved wallet locally ✅");
            }}
            style={{ backgroundColor: "#D81B60", borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14 }}
          >
            <Text style={{ color: "#FFF", fontWeight: "700" }}>Save wallet</Text>
          </Pressable>
        </View>

        {wallet ? (
          <Pressable onPress={() => Clipboard.setStringAsync(wallet)} style={styles.copyButton}>
            <Ionicons name="copy-outline" size={14} color="#D81B60" />
            <Text style={styles.copyText}>Copy Full Address</Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable onPress={handleSave} style={styles.button}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Save Changes</Text>}
      </Pressable>

      <Pressable onPress={handleSignOut} style={styles.signOutButton}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDECEF", padding: 20 },
  header: { fontSize: 24, fontWeight: "900", color: "#D81B60", marginBottom: 20 },
  card: { backgroundColor: "#FFF", borderRadius: 15, padding: 15, marginBottom: 15 },
  label: { fontWeight: "bold", marginBottom: 5, color: "#333" },
  input: { borderWidth: 1, borderColor: "#F48FB1", borderRadius: 10, padding: 12, color: "#000", backgroundColor: "#FFF" },
  copyButton: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 },
  copyText: { color: "#D81B60", fontWeight: "700", fontSize: 13 },
  button: { backgroundColor: "#D81B60", padding: 18, borderRadius: 99, alignItems: "center", marginTop: 10 },
  buttonText: { color: "#FFF", fontWeight: "bold", fontSize: 18 },
  signOutButton: { marginTop: 20, padding: 10, alignItems: "center" },
  signOutText: { color: "#D81B60", fontWeight: "bold", fontSize: 16 },
});