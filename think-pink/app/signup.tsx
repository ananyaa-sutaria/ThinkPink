import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../lib/AuthContext";
import { API_BASE } from "../lib/api";

export default function SignUpScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [wallet, setWallet] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!username || !password) {
      alert("Username and Password are required!");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/users/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, wallet }),
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
        alert("Success! Account created. 🌸");
        await signIn(data);
        router.replace("/(tabs)");
      } else {
        alert(data.error || "Signup failed");
      }
    } catch (error) {
      console.error(error);
      alert("Cannot connect to server. Check your backend terminal or network!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <TextInput style={styles.input} placeholder="Username" placeholderTextColor="#b97f92" value={username} onChangeText={setUsername} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#b97f92" secureTextEntry value={password} onChangeText={setPassword} />
      <TextInput style={styles.input} placeholder="Solana Wallet (Optional)" placeholderTextColor="#b97f92" value={wallet} onChangeText={setWallet} />
      
      <Pressable onPress={handleSignUp} style={styles.button} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Join ThinkPink</Text>}
      </Pressable>

      <Pressable onPress={() => router.back()} style={styles.linkButton}>
        <Text style={styles.linkText}>Already have an account? Sign In</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 30, backgroundColor: "#FDECEF" },
  title: { fontSize: 32, fontWeight: "900", color: "#D81B60", marginBottom: 30, textAlign: 'center' },
  input: { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#F48FB1", borderRadius: 15, padding: 15, marginBottom: 15 },
  button: { backgroundColor: "#D81B60", padding: 20, borderRadius: 99, alignItems: "center", marginTop: 10 },
  buttonText: { color: "#FFF", fontWeight: "bold", fontSize: 18 },
  linkButton: { marginTop: 20 },
  linkText: { color: "#D81B60", textAlign: "center" }
});