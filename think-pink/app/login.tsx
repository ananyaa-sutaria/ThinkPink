import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../lib/AuthContext";
import { API_BASE } from "../lib/api";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const handleSignIn = async () => {
    if (!username || !password) {
      alert("Please enter both username and password");
      return;
    }

    setLoading(true);
    try {
      const url = `${API_BASE}/api/users/signin`;

const response = await fetch(`${API_BASE}/api/users/signin`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
  body: JSON.stringify({
    username: username.trim(),
    password: password.trim(),
  }),
});      const text = await response.text();

      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        console.log("LOGIN non-JSON response:", text.slice(0, 200));
        throw new Error(`Server returned non-JSON (status ${response.status})`);
      }

      if (!response.ok) {
        throw new Error(data?.error || `Login failed (status ${response.status})`);
      }

      console.log("Sign in successful:", data);

      await signIn({
        userId: data.userId,
        name: data.name,
        wallet: data.wallet,
      });
      console.log("SIGNED IN DATA:", data);

      // if your tabs index route is something else, change this to "/(tabs)/home" etc.
      router.replace("/(tabs)" as any);
    } catch (error: any) {
      console.log("LOGIN error:", error?.message || error);
      alert(error?.message || "Cannot connect to server. Check backend terminal!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ThinkPink</Text>
      <Text style={styles.subtitle}>Welcome back!</Text>

      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable onPress={handleSignIn} style={styles.button} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Sign In</Text>
        )}
      </Pressable>

      <Pressable onPress={() => router.push("/signup" as any)} style={styles.linkButton}>
        <Text style={styles.linkText}>New here? Create an account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 30, backgroundColor: "#FDECEF" },
  title: { fontSize: 42, fontWeight: "900", color: "#D81B60", textAlign: "center" },
  subtitle: { fontSize: 18, color: "#F48FB1", textAlign: "center", marginBottom: 40 },
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F48FB1",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  button: { backgroundColor: "#D81B60", padding: 20, borderRadius: 99, alignItems: "center" },
  buttonText: { color: "#FFF", fontWeight: "bold", fontSize: 18 },
  linkButton: { marginTop: 20 },
  linkText: { color: "#D81B60", textAlign: "center" },
});