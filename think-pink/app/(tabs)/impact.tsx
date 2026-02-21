import React from "react";
import { View, Text, Pressable } from "react-native";
import { useProgress } from "../../lib/progressContext";

export default function ImpactScreen() {
  const { points } = useProgress();

  return (
    <View style={{ flex: 1, backgroundColor: "#FDECEF", padding: 16, gap: 12 }}>
      <View style={{ backgroundColor: "#FFF", borderRadius: 20, padding: 16, gap: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#333" }}>Impact</Text>
        <Text style={{ color: "#555" }}>Your points: {points}</Text>
      </View>

      <Pressable
        style={{
          backgroundColor: "#D81B60",
          paddingVertical: 12,
          borderRadius: 999,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#FFF", fontWeight: "700" }}>Find donation centers</Text>
      </Pressable>
    </View>
  );
}