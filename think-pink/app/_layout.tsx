import { Stack } from "expo-router";
import { AuthProvider } from "../lib/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#FDECEF" },
          headerTintColor: "#D81B60",
          headerTitleStyle: { fontWeight: "900" },
          headerShadowVisible: false, // Removes the line under the header
        }}
      >
        <Stack.Screen name="login" options={{ title: "Sign In" }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="account" 
          options={{ 
            presentation: "modal", 
            title: "Profile Settings" 
          }} 
        />
      </Stack>
    </AuthProvider>
  );
}