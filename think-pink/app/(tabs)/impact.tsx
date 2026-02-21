import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { useProgress } from "../../lib/progressContext";

export default function ImpactScreen() {
  const { points } = useProgress();
  const [region, setRegion] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const location = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    })();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Impact</Text>
        <Text>Your points: {points}</Text>
      </View>

      <Pressable style={styles.button}>
        <Text style={styles.buttonText}>Find donation centers</Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.title}>Map</Text>

        <View style={styles.mapContainer}>
          {region && (
            <MapView style={styles.map} region={region} showsUserLocation>
              <Marker coordinate={region} title="You are here" />
            </MapView>
          )}
        </View>

        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Upload donation photo</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDECEF", padding: 16, gap: 12 },
  card: { backgroundColor: "#FFF", borderRadius: 20, padding: 16, gap: 10 },
  title: { fontSize: 18, fontWeight: "800", color: "#333" },
  mapContainer: { height: 220, borderRadius: 16, overflow: "hidden" },
  map: { flex: 1 },
  button: {
    backgroundColor: "#D81B60",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
  },
  buttonText: { color: "#FFF", fontWeight: "700" },
});