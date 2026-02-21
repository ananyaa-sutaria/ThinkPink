import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../lib/AuthContext";
import { View, ActivityIndicator } from "react-native";

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return; // Don't do anything while checking session

    // Check if the user is currently inside the (tabs) folder
    const inTabsGroup = segments[0] === "(tabs)";

    if (!user && inTabsGroup) {
      // If NOT logged in but trying to see Home/Tabs, force them to Login
      router.replace("/login");
    } else if (user && !inTabsGroup) {
      // If LOGGED in but stuck on Login/Signup, send them to Home
      router.replace("/(tabs)");
    }
  }, [user, segments, isLoading]);

  // Show a loading spinner while the AuthContext is initializing
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FDECEF" }}>
        <ActivityIndicator size="large" color="#D81B60" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}