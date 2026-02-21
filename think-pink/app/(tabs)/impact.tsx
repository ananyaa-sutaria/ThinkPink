import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, View, Text, Pressable, StyleSheet, Platform, Linking } from "react-native";
import { useProgress } from "../../lib/progressContext";
import * as Location from "expo-location";

export default function Impact() {
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
    <ScrollView contentContainerStyle={styles.content}>
      {/* Points Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Impact</Text>
        <Text style={styles.cardText}>Your points: {points}</Text>
      </View>

      {/* Map Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Map</Text>

        {permDenied ? (
          <Text style={styles.warningText}>
            Location permission denied. You can still open a donation search manually.
          </Text>
        ) : !coords ? (
          <Text style={styles.cardText}>Getting your location…</Text>
        ) : isWeb ? (
          <>
            <View style={styles.mapPlaceholder}>
              <Text style={styles.cardText}>
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
      </View>

      {/* Upload Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Upload Donation Photo</Text>
        <Pressable onPress={() => {}} style={styles.primaryBtn}>
          <Text style={styles.primaryText}>Upload</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

/** Native-only map component */
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
  content: {
    flexGrow: 1,
    padding: 25,
    paddingTop: 40,
    paddingBottom: 80, // ensures content stops above tab bar
    gap: 18,
    backgroundColor: "#fff",
  },
  card: {
    gap: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ea9ab2",
    borderRadius: 10,
    backgroundColor: "#fff",
    shadowColor: "#ea9ab2",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  cardTitle: {
    fontFamily: "Onest-Bold",
    fontSize: 24,
    color: "#250921",
  },
  cardText: {
    fontFamily: "Onest",
    fontSize: 16,
    color: "#250921",
  },
  warningText: {
    fontFamily: "Onest",
    fontSize: 16,
    color: "#C62828",
  },
  primaryBtn: {
    backgroundColor: "#D81B60",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  primaryText: {
    color: "#fff",
    fontWeight: "700",
  },
  mapContainer: {
    height: 200,
    borderRadius: 15,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F0C3D2",
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    height: 200,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#F0C3D2",
    backgroundColor: "#fff",
    justifyContent: "center",
    padding: 12,
  },
});