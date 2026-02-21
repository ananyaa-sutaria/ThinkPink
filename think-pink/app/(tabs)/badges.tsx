import { View, Text, Pressable } from "react-native";
import { useEffect, useState } from "react";
import { getCycleBadgeUnlocked } from "../../lib/progressStore";

const [unlocked, setUnlocked] = useState(false);
useEffect(() => {
  getCycleBadgeUnlocked().then(setUnlocked);
}, []);
export default function BadgesScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: "#FDECEF", padding: 16, gap: 12 }}>
      <View style={{ backgroundColor: "#FFF", borderRadius: 20, padding: 16, gap: 8 }}>
        <Text style={{ color: "#333", fontSize: 18, fontWeight: "800" }}>Badges</Text>
        <Text style={{ color: "#555" }}>
          Earn credentials for learning and impact. Later, mint on Solana devnet.
        </Text>
      </View>

      <BadgeCard title="Cycle Literacy Level 1" subtitle="Complete lessons + quiz to unlock" locked />
      <BadgeCard title="Period Equity Supporter" subtitle="Log a donation to unlock" locked />

      <Pressable
        onPress={() => {}}
        style={{ backgroundColor: "#D81B60", borderRadius: 999, paddingVertical: 12, alignItems: "center" }}
      >
        <Text style={{ color: "#FFF", fontWeight: "700" }}>Mint unlocked badge</Text>
      </Pressable>
    </View>
  );
}

function BadgeCard({ title, subtitle, locked }: { title: string; subtitle: string; locked?: boolean }) {
  return (
    <View style={{ backgroundColor: "#FFF", borderRadius: 20, padding: 16, gap: 6, opacity: locked ? 0.7 : 1 }}>
      <Text style={{ color: "#333", fontSize: 16, fontWeight: "800" }}>{title}</Text>
      <Text style={{ color: "#555" }}>{subtitle}</Text>
      <Text style={{ color: "#D81B60", marginTop: 6 }}>{locked ? "Locked" : "Unlocked"}</Text>
    </View>
  );
}