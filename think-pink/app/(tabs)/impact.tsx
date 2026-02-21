import { View, Text, Pressable } from "react-native";
import MapView from 'react-native-maps';

export default function ImpactScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: "#FDECEF", padding: 16, gap: 12 }}>
      <View style={{ backgroundColor: "#FFF", borderRadius: 20, padding: 16, gap: 8 }}>
        <Text style={{ color: "#333", fontSize: 18, fontWeight: "800" }}>Impact</Text>
        <Text style={{ color: "#555" }}>
          Find menstrual product donation centers near you and log donations.
        </Text>
      </View>

      <View style={{ backgroundColor: "#FFF", borderRadius: 20, padding: 16, gap: 10 }}>
        <Text style={{ color: "#333", fontWeight: "800" }}>Map placeholder</Text>
        <View style={{ height: 220, borderRadius: 16, backgroundColor: "#FDECEF" }} />
        <Pressable
          onPress={() => {}}
          style={{ backgroundColor: "#D81B60", borderRadius: 999, paddingVertical: 12, alignItems: "center" }}
        >
          <Text style={{ color: "#FFF", fontWeight: "700" }}>Upload donation photo</Text>
        </Pressable>
      </View>
    </View>
  );
}