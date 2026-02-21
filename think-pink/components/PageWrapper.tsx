// components/PageWrapper.tsx
import React from "react";
import { View, StyleSheet } from "react-native";

export default function PageWrapper({ children }: { children: React.ReactNode }) {
  return <View style={styles.container}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 25,
    paddingTop: 40,
    paddingBottom: 20, // leaves space for bottom tab bar
    gap: 18, // optional: spacing between stacked elements
    overflow: "visible", // allows shadows to show outside container
  },
});