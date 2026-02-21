import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform, Linking } from "react-native";
import { useProgress } from "../../lib/progressContext";
import * as Location from "expo-location";

export default function ImpactScreen() {
  const { points } = useProgress();
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [permDenied, setPermDenied] = useState(false);

  const isWeb = Platform.OS === "web";

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPermDenied(true);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    })();
  }, []);

  const mapsUrl = useMemo(() => {
    if (!coords) return null;
    const { latitude, longitude } = coords;
    return `https://www.google.com/maps/search/menstrual+product+donation+center/@${latitude},${longitude},13z`;
  }, [coords]);

  async function openMaps() {
    if (!mapsUrl) return;
    await Linking.openURL(mapsUrl);
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#FDECEF", padding: 16, gap: 12 }}>
      <View style={{ backgroundColor: "#FFF", borderRadius: 20, padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#333" }}>Impact</Text>
        <Text style={{ color: "#555", marginTop: 4 }}>Your points: {points}</Text>
      </View>

      <View style={{ backgroundColor: "#FFF", borderRadius: 20, padding: 16, gap: 10 }}>
        <Text style={{ color: "#333", fontWeight: "800" }}>Map</Text>

        {permDenied ? (
          <Text style={{ color: "#C62828" }}>
            Location permission denied. You can still open a donation search manually.
          </Text>
        ) : !coords ? (
          <Text style={{ color: "#555" }}>Getting your location…</Text>
        ) : isWeb ? (
          <>
            <View style={styles.webMapPlaceholder}>
              <Text style={{ color: "#555" }}>
                Map preview is available on mobile. On web, open the map in a new tab.
              </Text>
            </View>
            <Pressable onPress={openMaps} style={styles.primaryBtn}>
              <Text style={styles.primaryText}>Open Donation Map</Text>
            </Pressable>
          </>
        ) : (
          <NativeMap coords={coords} />
        )}

        <Pressable onPress={() => {}} style={styles.primaryBtn}>
          <Text style={styles.primaryText}>Upload donation photo</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Native-only map: web will NEVER import react-native-maps because we require it here.
 */
function NativeMap({ coords }: { coords: { latitude: number; longitude: number } }) {
  const MapView = useMemo(() => require("react-native-maps").default, []);
  const Marker = useMemo(() => require("react-native-maps").Marker, []);

  const region = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={styles.mapContainer}>
      <MapView style={styles.map} region={region} showsUserLocation>
        <Marker coordinate={{ latitude: coords.latitude, longitude: coords.longitude }} title="You" />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F0C3D2",
  },
  map: { flex: 1 },
  webMapPlaceholder: {
    height: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0C3D2",
    backgroundColor: "#FDECEF",
    padding: 12,
    justifyContent: "center",
  },
  primaryBtn: {
    backgroundColor: "#D81B60",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryText: { color: "#FFF", fontWeight: "700" },
});