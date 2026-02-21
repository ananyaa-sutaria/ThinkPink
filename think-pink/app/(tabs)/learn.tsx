import { View, Text, Pressable } from "react-native";

export default function LearnScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: "#FDECEF", padding: 16, gap: 12 }}>
      <Card title="Cycle Literacy Level 1" subtitle="3 micro-lessons + a quick quiz" />
      <Card title="Lesson 1" subtitle="The 4 phases, explained simply" />
      <Card title="Lesson 2" subtitle="Why symptoms happen" />
      <Card title="Lesson 3" subtitle="Nutrition by phase" />

      <Pressable
        onPress={() => {}}
        style={{ backgroundColor: "#D81B60", borderRadius: 999, paddingVertical: 12, alignItems: "center" }}
      >
        <Text style={{ color: "#FFF", fontWeight: "700" }}>Start quiz</Text>
      </Pressable>
    </View>
  );
}

function Card({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={{ backgroundColor: "#FFF", borderRadius: 20, padding: 16, gap: 6 }}>
      <Text style={{ color: "#333", fontSize: 18, fontWeight: "800" }}>{title}</Text>
      <Text style={{ color: "#555" }}>{subtitle}</Text>
    </View>
  );
}