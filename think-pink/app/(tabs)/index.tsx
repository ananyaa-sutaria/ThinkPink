import { View, Text, Pressable, ScrollView } from "react-native";
import { getTodayMock } from "../../lib/mock";
import { phaseColors, phaseLabel } from "../../lib/phases";
import { useRouter } from "expo-router";
import { useAuth } from "../../lib/AuthContext";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth(); 
  const today = getTodayMock();
  const colors = phaseColors[today.phase];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FDECEF" }}>
      
      <View style={{ padding: 16, gap: 14 }}>
        
        {/* Personalized Welcome Section */}
        <View style={{ marginBottom: 10 }}>
          <Text style={{ fontSize: 28, fontWeight: "900", color: "#D81B60" }}>
            Hi, {user?.name || "Warrior"}! 🌸
          </Text>
          <Text style={{ color: "#F48FB1", fontSize: 16 }}>
            ID: {user?.id || "Guest"}
          </Text>
        </View>

        {/* Main Cycle Card */}
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 20, padding: 16, shadowOpacity: 0.08, shadowRadius: 10 }}>
          <Text style={{ color: "#333", fontSize: 22, fontWeight: "700" }}>
            Today: {phaseLabel[today.phase]}
          </Text>
          <Text style={{ color: "#333", marginTop: 6 }}>Cycle Day {today.cycleDay}</Text>

          {/* Progress Bar */}
          <View style={{ marginTop: 12, height: 10, borderRadius: 999, backgroundColor: "#F3D3DC", overflow: "hidden" }}>
            <View style={{ width: `${(today.cycleDay / 28) * 100}%`, height: "100%", backgroundColor: colors.accent }} />
          </View>

          {/* Insight Box */}
          <View style={{ marginTop: 14, padding: 12, borderRadius: 16, backgroundColor: colors.fill, borderWidth: 1, borderColor: colors.accent }}>
            <Text style={{ color: "#333" }}>{today.insight}</Text>
          </View>

          <Pressable
            onPress={() => router.push("/(tabs)/log")}
            style={{ marginTop: 14, paddingVertical: 12, borderRadius: 999, backgroundColor: "#D81B60", alignItems: "center" }}
          >
            <Text style={{ color: "#FFF", fontWeight: "700" }}>Open Calendar</Text>
          </Pressable>
        </View>

        {/* Quick Actions */}
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 20, padding: 16, shadowOpacity: 0.08, shadowRadius: 10, gap: 8 }}>
          <Text style={{ color: "#333", fontSize: 18, fontWeight: "700" }}>Quick actions</Text>
          <Pressable onPress={() => router.push("/(tabs)/learn")} style={{ paddingVertical: 12, borderRadius: 14, backgroundColor: "#FDECEF" }}>
            <Text style={{ color: "#333", paddingHorizontal: 12 }}>Continue Cycle Literacy</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/(tabs)/impact")} style={{ paddingVertical: 12, borderRadius: 14, backgroundColor: "#FDECEF" }}>
            <Text style={{ color: "#333", paddingHorizontal: 12 }}>Find donation centers</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}