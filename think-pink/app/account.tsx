import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { getWalletAddress } from "../lib/walletStore";

export default function AccountScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [username, setUsername] = useState<string>(user?.name || "");
  const [wallet, setWallet] = useState<string>(user?.wallet || "");
  const [password, setPassword] = useState<string>("");

  useEffect(() => {
    // If the user object doesn't have a wallet, check the local store
    if (!wallet) {
      getWalletAddress().then((w) => setWallet(w || ""));
    }
  }, []);

  const handleSave = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/users/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id, // Using the unique ID from your schema
          name: username,
          wallet: wallet,
          password: password,
        }),
      });

      if (response.ok) {
        alert("Changes saved to Database! ✅");
        router.back();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error(error);
      alert("Could not connect to server. Check if terminal is running!");
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

  const shortWallet =
    wallet.length > 8
      ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}`
      : wallet;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Account Settings</Text>

      {/* Profile Card */}
      <View style={styles.card}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
        />
        
        <Text style={[styles.label, { marginTop: 15 }]}>Update Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      {/* Wallet Card */}
      <View style={styles.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={styles.label}>Solana Wallet</Text>
          <Text style={{ color: "#D81B60", fontSize: 12, fontWeight: "700" }}>Devnet</Text>
        </View>
        
        <Text style={styles.walletText}>{wallet ? shortWallet : "No wallet connected"}</Text>
        
        {wallet && (
          <Pressable
            onPress={() => Clipboard.setStringAsync(wallet)}
            style={styles.copyButton}
          >
            <Ionicons name="copy-outline" size={14} color="#D81B60" />
            <Text style={styles.copyText}>Copy Full Address</Text>
          </Pressable>
        )}
      </View>

      <Pressable onPress={handleSave} style={styles.button}>
        <Text style={styles.buttonText}>Save Changes</Text>
      </Pressable>

      <Pressable onPress={handleSignOut} style={styles.signOutButton}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
      
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={16} color="#D81B60" />
        <Text style={styles.backText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDECEF", padding: 20 },
  header: { fontSize: 24, fontWeight: "900", color: "#D81B60", marginBottom: 20 },
  card: { backgroundColor: "#FFF", borderRadius: 15, padding: 15, marginBottom: 15 },
  label: { fontWeight: "bold", marginBottom: 5, color: "#333" },
  input: {
    borderWidth: 1,
    borderColor: "#F48FB1",
    borderRadius: 10,
    padding: 12,
    color: "#000",
    backgroundColor: "#FFF",
  },
  walletText: { color: "#555", marginVertical: 5 },
  copyButton: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 },
  copyText: { color: "#D81B60", fontWeight: "700", fontSize: 13 },
  button: {
    backgroundColor: "#D81B60",
    padding: 18,
    borderRadius: 99,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#FFF", fontWeight: "bold", fontSize: 18 },
  signOutButton: { marginTop: 20, padding: 10, alignItems: "center" },
  signOutText: { color: "#D81B60", fontWeight: "bold", fontSize: 16 },
  backButton: { marginTop: "auto", flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5 },
  backText: { color: "#D81B60", fontWeight: "bold" }
});
