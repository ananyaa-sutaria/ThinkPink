import { Stack } from "expo-router";
import { ProgressProvider } from "../lib/progressContext";

export default function RootLayout() {
  return (
    <ProgressProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        {/* if you have other screens like account, keep them here */}
        <Stack.Screen name="account" /> 
      </Stack>
    </ProgressProvider>
  );
}