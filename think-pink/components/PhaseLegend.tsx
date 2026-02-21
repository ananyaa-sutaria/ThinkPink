import { View, Text } from "react-native";
import { phaseColors, phaseLabel, Phase } from "../lib/phases";

const phases: Phase[] = ["menstrual", "follicular", "ovulation", "luteal"];

export default function PhaseLegend() {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {phases.map((p) => (
        <View key={p} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 4,
              backgroundColor: phaseColors[p].fill,
              borderWidth: 1,
              borderColor: phaseColors[p].accent,
            }}
          />
          <Text style={{ color: "#333" }}>{phaseLabel[p]}</Text>
        </View>
      ))}
    </View>
  );
}