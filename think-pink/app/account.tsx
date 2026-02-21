import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useAuth } from "../lib/AuthContext";

export default function AccountScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [username, setUsername] = useState(user?.name || "");
  const [wallet, setWallet] = useState(user?.wallet || "");
  const [password, setPassword] = useState("");

  const handleSave = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/users/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
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
      // FIX: Added 'as any' to bypass strict routing check
      router.replace("/login" as any); 
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Account Settings</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          defaultValue={username}
          onChangeText={setUsername}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Solana Wallet</Text>
        <TextInput
          style={styles.input}
          defaultValue={wallet}
          onChangeText={setWallet}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Update Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          secureTextEntry
          onChangeText={setPassword}
        />
      </View>

      <Pressable 
        onPress={handleSave} 
        style={({ pressed }) => [styles.button, { opacity: pressed ? 0.7 : 1 }]}
      >
        <Text style={styles.buttonText}>Save Changes</Text>
      </Pressable>

      <Pressable 
        onPress={handleSignOut} 
        style={({ pressed }) => [
          styles.signOutButton, 
          { backgroundColor: pressed ? "#FFEBEE" : "transparent" }
        ]}
      >
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
  input: {
    borderWidth: 1,
    borderColor: "#F48FB1",
    borderRadius: 10,
    padding: 12,
    color: "#000",
    backgroundColor: "#FFF",
  },
  button: {
    backgroundColor: "#D81B60",
    padding: 18,
    borderRadius: 99,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#FFF", fontWeight: "bold", fontSize: 18 },
  signOutButton: { marginTop: 30, padding: 15, borderRadius: 15, alignItems: "center" },
  signOutText: { color: "#D81B60", fontWeight: "bold", fontSize: 16 },
});