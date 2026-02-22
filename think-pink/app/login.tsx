import * as React from "react";
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
      });

      const contentType = response.headers.get("content-type") || "";
      let data: any;

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.warn("Server returned non-JSON:", text);
        throw new Error(`Server returned non-JSON (status ${response.status})`);
      }

      if (!response.ok) {
        throw new Error(data?.error || `Login failed (status ${response.status})`);
      }

      await signIn({
        userId: data.userId,
        name: data.name,
        wallet: data.wallet,
      });

      router.replace("/(tabs)" as any);
    } catch (error: any) {
      console.log("LOGIN error:", error?.message || error);
      alert(error?.message || "Cannot connect to server. Check backend terminal!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.logIn, styles.textFlexBox]}>
      <View style={[styles.title, styles.textFlexBox]}>
        <Text style={styles.thinkPink}>Think Pink</Text>
        <Text style={[styles.theAppFor, styles.logIn2FlexBox]}>
          The app for your every period need
        </Text>
      </View>

      <View style={styles.div} />

      {/* Username / Email Input */}
      <View style={styles.email}>
        <Text style={[styles.email2, styles.emailTypo]}>Email:</Text>
        <View style={[styles.typeBar, styles.typeBarFlexBox]}>
          <TextInput
            placeholder="Email"
            placeholderTextColor="#efcfe3"
            style={[styles.email3, styles.emailTypo, { flex: 1 }]}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
      </View>

      {/* Password Input */}
      <View style={styles.email}>
        <Text style={[styles.email2, styles.emailTypo]}>Password:</Text>
        <View style={[styles.typeBar, styles.typeBarFlexBox]}>
          <TextInput
            placeholder="Password"
            placeholderTextColor="#efcfe3"
            style={[styles.email3, styles.emailTypo, { flex: 1 }]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
      </View>

      {/* Sign In Button */}
      <Pressable
        onPress={handleSignIn}
        style={[styles.button, styles.buttonBorder, { opacity: loading ? 0.7 : 1 }]}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <View style={[styles.text, styles.textFlexBox]}>
            <Text style={[styles.logIn2, styles.logIn2FlexBox]}>Log In</Text>
          </View>
        )}
      </Pressable>

      {/* Forgot Password / Sign Up */}
      <View style={[styles.forgotPass, styles.typeBarFlexBox]}>
        <Pressable onPress={() => alert("Forgot password flow")}>
          <Text style={[styles.forgotPassword, styles.emailTypo]}>Forgot password?</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/signup" as any)}>
          <Text style={[styles.forgotPassword, styles.emailTypo]}>Sign Up</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  textFlexBox: {
    justifyContent: "center",
    alignItems: "center",
  },
  logIn2FlexBox: {
    textAlign: "center",
    fontSize: 20,
    alignSelf: "stretch",
  },
  emailTypo: {
    fontSize: 16,
    textAlign: "left",
  },
  typeBarFlexBox: {
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  buttonBorder: {
    borderWidth: 1,
    borderColor: "#ea9ab2",
    borderStyle: "solid",
  },
  logIn: {
    width: "100%",
    height: "100%",
    backgroundColor: "#efcfe3",
    paddingHorizontal: 25,
    paddingTop: 20,
    paddingBottom: 80,
    gap: 18,
    overflow: "hidden",
  },
  title: {
    alignSelf: "stretch",
    overflow: "hidden",
  },
  thinkPink: {
    fontSize: 64,
    textAlign: "left",
    color: "#fff",
    fontFamily: "LeckerliOne-Regular",
  },
  theAppFor: {
    color: "#a40e4c",
    fontSize: 20,
    fontFamily: "LeckerliOne-Regular",
  },
  div: {
    height: 1,
    borderTopWidth: 1,
    borderColor: "#ea9ab2",
    borderStyle: "solid",
    alignSelf: "stretch",
  },
  email: {
    gap: 5,
    width: "100%",
  },
  email2: {
    fontFamily: "Onest",
    color: "#a40e4c",
  },
  typeBar: {
    width: "100%",
    borderRadius: 15,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: "#ea9ab2",
    borderStyle: "solid",
  },
  email3: {
    color: "#a40e4c",
    fontFamily: "Onest",
  },
  button: {
    shadowColor: "#ea9ab2",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
    borderRadius: 10,
    backgroundColor: "#c7547f",
    padding: 10,
    alignSelf: "stretch",
    overflow: "hidden",
  },
  text: {
    alignSelf: "stretch",
  },
  logIn2: {
    fontWeight: "700",
    fontFamily: "Onest",
    color: "#fff",
    fontSize: 20,
  },
  forgotPass: {
    justifyContent: "space-between",
    gap: 20,
    alignSelf: "stretch",
    flexDirection: "row",
  },
  forgotPassword: {
    textDecorationLine: "underline",
    fontFamily: "Franklin Gothic Book",
    color: "#c7547f",
  },
});
