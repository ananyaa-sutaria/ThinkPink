import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../lib/AuthContext"; // Import useAuth to log them in

export default function AuthScreen() {
  const router = useRouter();
  const { signIn } = useAuth(); // Get the signIn function from context
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async () => {
    // 1. Validation
    if (!username || !password) {
      alert("Please enter both username and password");
      return;
    }

    console.log("Attempting to create account for:", username);

    try {
      // 2. Connect to your backend
      const response = await fetch("http://localhost:5000/api/users/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Account Created Successfully! 🎉");
        
        // 3. Automatically sign them in with the data from MongoDB
        // Ensure your AuthContext signIn handles the user object
        await signIn(data);
        
        // 4. Move to the main app
        router.replace("/(tabs)"); 
      } else {
        alert(data.error || "Signup failed");
      }
    } catch (error) {
      console.error("Signup Error:", error);
      alert("Cannot connect to server. Is your backend terminal running on port 5000?");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      <Pressable 
        onPress={handleSignup} 
        style={({ pressed }) => [
          styles.button, 
          { opacity: pressed ? 0.8 : 1 }
        ]}
      >
        <Text style={styles.buttonText}>Sign Up</Text>
      </Pressable>
      
      <Pressable onPress={() => router.push("/login")} style={{ marginTop: 20 }}>
        <Text style={{ color: "#D81B60", textAlign: "center" }}>
          Already have an account? Sign In
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: "#FDECEF" },
  title: { fontSize: 28, fontWeight: "900", color: "#D81B60", marginBottom: 30, textAlign: 'center' },
  inputContainer: { marginBottom: 15 },
  label: { fontWeight: "bold", marginBottom: 5, color: "#333" },
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F48FB1",
    borderRadius: 10,
    padding: 12,
    color: "#000"
  },
  button: {
    backgroundColor: "#D81B60",
    padding: 18,
    borderRadius: 99,
    alignItems: "center",
    marginTop: 20
  },
  buttonText: { color: "#FFF", fontWeight: "bold", fontSize: 18 }
});