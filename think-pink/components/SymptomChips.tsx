import { View, Pressable, Text } from "react-native";

export default function SymptomChips({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (symptom: string) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((s) => {
        const isOn = selected.includes(s);
        return (
          <Pressable
            key={s}
            onPress={() => onToggle(s)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: isOn ? "#D81B60" : "#FFFFFF",
              borderWidth: 1,
              borderColor: isOn ? "#D81B60" : "#F48FB1",
            }}
          >
            <Text style={{ color: isOn ? "#FFFFFF" : "#333" }}>{s}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}