import { View, Text, Pressable, StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { useEffect, useState } from "react";



export default function ImpactScreen() {
  const [region, setRegion] = useState<any>(null);
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        console.log("Location permission denied");
        return;
      }

      let location = await Location.getCurrentPositionAsync({});

      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    })();
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: "#FDECEF", padding: 16, gap: 12 }}>
      <View style={{ backgroundColor: "#FFF", borderRadius: 20, padding: 16, gap: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#333" }}>Impact</Text>
        {/* <Text style={{ color: "#555" }}>Your points: {points}</Text> */}
      </View>

      <View style={{ backgroundColor: "#FFF", borderRadius: 20, padding: 16, gap: 10 }}>
        <Text style={{ color: "#333", fontWeight: "800" }}>Map</Text>
        <View style={styles.mapContainer}>
          {region && (
            <MapView
              style={styles.map}
              region={region}
              showsUserLocation
            >
              <Marker
                coordinate={{
                  latitude: region.latitude,
                  longitude: region.longitude,
                }}
                title="Temporary Donation Center"
              />
            </MapView>
          )}
        </View>
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
const styles = StyleSheet.create({
  mapContainer: {
    height: 220,
    borderRadius: 16,
    overflow: "hidden", // rounded corners
  },
  map: {
    flex: 1,
  },
});