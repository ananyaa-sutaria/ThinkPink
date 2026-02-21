import { Stack } from "expo-router";
import { ProgressProvider } from "../lib/progressContext"; 
import { AuthProvider } from "../lib/AuthContext"; // Assuming you have this too!

export default function RootLayout() {
  return (
    <AuthProvider>
      <ProgressProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ presentation: 'modal', title: "Login" }} />
          <Stack.Screen name="account" options={{ title: "Account Settings" }} />
        </Stack>
      </ProgressProvider>
    </AuthProvider>
  );
}