import { View, Text, Pressable } from "react-native";
import { useProgress } from "../../lib/progressContext";

export default function Rewards() {
  const { points, addPoints } = useProgress();

  async function redeem(cost: number) {
    if (points < cost) return;
    await addPoints(-cost);
  }

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: "#FDECEF", gap: 12 }}>
      <View style={{ backgroundColor: "#FFF", padding: 16, borderRadius: 20 }}>
        <Text style={{ fontWeight: "800", fontSize: 18 }}>Rewards</Text>
        <Text style={{ marginTop: 6 }}>You have {points} points</Text>
      </View>

      <View style={{ backgroundColor: "#FFF", padding: 16, borderRadius: 20 }}>
        <Text style={{ fontWeight: "700" }}>10% Off Period Products</Text>
        <Text>Cost: 150 points</Text>
        <Pressable
          onPress={() => redeem(150)}
          style={{
            marginTop: 10,
            backgroundColor: "#D81B60",
            paddingVertical: 10,
            borderRadius: 999,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#FFF" }}>Redeem</Text>
        </Pressable>
      </View>

      <View style={{ backgroundColor: "#FFF", padding: 16, borderRadius: 20 }}>
        <Text style={{ fontWeight: "700" }}>Donate 1 Period Kit</Text>
        <Text>Cost: 200 points</Text>
        <Pressable
          onPress={() => redeem(200)}
          style={{
            marginTop: 10,
            backgroundColor: "#D81B60",
            paddingVertical: 10,
            borderRadius: 999,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#FFF" }}>Redeem</Text>
        </Pressable>
      </View>
    </View>
  );
}