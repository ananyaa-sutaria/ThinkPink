import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../lib/AuthContext";

export default function SignUpScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [wallet, setWallet] = useState("");

  const handleSignUp = async () => {
    if (!username || !password) {
      alert("Username and Password are required!");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/users/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, wallet }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Success! Account created. 🌸");
        await signIn(data as any);
        router.replace("/(tabs)" as any);
      } else {
        alert(data.error || "Signup failed");
      }
    } catch (error) {
      alert("Cannot reach server. Check your terminal!");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      
      <TextInput style={styles.input} placeholder="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Solana Wallet (Optional)" value={wallet} onChangeText={setWallet} />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />

      <Pressable onPress={handleSignUp} style={styles.button}>
        <Text style={styles.buttonText}>Join ThinkPink</Text>
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