import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  TextInput,
  Modal,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";

// Libs/Contexts
import { useProgress } from "../../lib/progressContext";
import { useAuth } from "../../lib/AuthContext";
import { getOrCreateUserId } from "../../lib/userId";
import { getWalletAddress } from "../../lib/walletStore";
import { API_BASE } from "@/lib/config";
import { submitImpact } from "../../lib/impactClient";

type Coords = { lat: number; lng: number };

export default function ImpactScreen() {
  const { points, addPoints } = useProgress();
  const { user } = useAuth();

  // State
  const [coords, setCoords] = useState<Coords | null>(null);
  const [centers, setCenters] = useState<any[]>([]);
  const [permDenied, setPermDenied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [image, setImage] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<any | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // 1. Setup: Location & Centers with Debug Logging
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPermDenied(true);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();

    // Fetch locations and log them to the terminal
    fetch(`${API_BASE}/locations`, {
      headers: { "ngrok-skip-browser-warning": "true" },
    })
      .then(async (res) => {
        const text = await res.text();
        console.log("📍 RAW SERVER RESPONSE (Locations):", text);

        try {
          const json = JSON.parse(text);
          if (Array.isArray(json)) {
            setCenters(json);
          }
        } catch (e) {
          console.log("❌ NOT JSON — check backend terminal for errors");
        }
      })
      .catch((err) => console.log("Fetch centers error:", err));
  }, []);

  // 2. Debounced Search Logic
  useEffect(() => {
    if (query.length < 3 || selectedPlace) return;

    const delayDebounceFn = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const res = await fetch(`${API_BASE}/impact/places-autocomplete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
          },
          body: JSON.stringify({ query, near: coords }),
        });
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      } catch (e) {
        setSuggestions([]);
      } finally {
        setLoadingSearch(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query, coords, selectedPlace]);

  // 3. Actions
  const pickImage = async () => {
    setStatusMsg("");
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return setStatusMsg("Photos permission denied.");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setImage({
        uri: asset.uri,
        name: asset.uri.split("/").pop() || `donation_${Date.now()}.jpg`,
        type: "image/jpeg",
      });
    }
  };

  const onSelectPlace = async (placeId: string) => {
    setLoadingSearch(true);
    setStatusMsg("");
    try {
      const res = await fetch(`${API_BASE}/impact/place-details`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ placeId }),
      });
      const data = await res.json();
      setSelectedPlace(data.place);
      setQuery(`${data.place.name} — ${data.place.address}`);
      setSuggestions([]);
    } catch (e) {
      setStatusMsg("Couldn’t load place details");
    } finally {
      setLoadingSearch(false);
    }
  };

  const onSubmit = async () => {
    if (!image) return setStatusMsg("Please pick a photo.");
    if (!selectedPlace) return setStatusMsg("Please choose a location.");

    setSubmitting(true);
    setStatusMsg("");
    try {
      const userId = (user as any)?.userId || (user as any)?.id || (await getOrCreateUserId());
      const wallet = await getWalletAddress();

      const form = new FormData();
      form.append("userId", userId);
      form.append("walletAddress", wallet || "");
      form.append("locationName", selectedPlace.name);
      form.append("locationLat", String(selectedPlace.lat));
      form.append("locationLng", String(selectedPlace.lng));
      form.append("photo", image as any);

      await submitImpact(form);
      await addPoints(10);

      setStatusMsg("Submitted for approval ✅");
      setImage(null);
      setSelectedPlace(null);
      setQuery("");
      setTimeout(() => setIsModalOpen(false), 2000);
    } catch (e: any) {
      setStatusMsg(e?.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, gap: 16 }}>
      {/* Points Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Impact</Text>
        <Text style={styles.pointsText}>Your points: {points}</Text>
      </View>

      {/* Map Card */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Nearby Centers</Text>
        {permDenied ? (
          <Text style={styles.errorText}>Location permission denied.</Text>
        ) : !coords ? (
          <Text style={styles.pointsText}>Getting your location…</Text>
        ) : Platform.OS === "web" ? (
          <View style={styles.webPlaceholder}>
            <Text style={{ color: "#555", textAlign: "center" }}>
              Map preview is available on mobile only.
            </Text>
          </View>
        ) : (
          <NativeMap coords={coords} centers={centers} />
        )}

        <Pressable onPress={() => setIsModalOpen(true)} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Log a Donation</Text>
        </Pressable>
      </View>

      {/* Submission Modal */}
      <Modal visible={isModalOpen} animationType="slide">
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setIsModalOpen(false)}>
              <Text style={styles.backBtn}>← Back</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Submit Donation</Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 40 }}>
            {/* Step 1: Photo */}
            <View style={styles.card}>
              <Text style={styles.stepTitle}>1. Donation proof</Text>
              <Pressable style={styles.secondaryBtn} onPress={pickImage}>
                <Text style={styles.secondaryBtnText}>{image ? "Change photo" : "Pick a photo"}</Text>
              </Pressable>
              {image && (
                <Image
                  source={{ uri: image.uri }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
              )}
            </View>

            {/* Step 2: Location */}
            <View style={styles.card}>
              <Text style={styles.stepTitle}>2. Donation location</Text>
              <TextInput
                value={query}
                onChangeText={(t) => {
                  setQuery(t);
                  setSelectedPlace(null);
                }}
                placeholder="Search: 'UF pantry' or 'center'…"
                style={styles.input}
              />
              {loadingSearch && <ActivityIndicator size="small" color="#D81B60" style={{ marginTop: 8 }} />}
              
              {suggestions.length > 0 && (
                <View style={styles.suggestionBox}>
                  {suggestions.map((s) => (
                    <Pressable
                      key={s.placeId}
                      onPress={() => onSelectPlace(s.placeId)}
                      style={styles.suggestionItem}
                    >
                      <Text style={{ color: "#333" }} numberOfLines={1}>
                        {s.description}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Step 3: Submit */}
            <Pressable
              onPress={onSubmit}
              disabled={submitting}
              style={[styles.primaryBtn, submitting && { opacity: 0.7 }]}
            >
              <Text style={styles.primaryBtnText}>
                {submitting ? "Submitting…" : "Submit for approval"}
              </Text>
            </Pressable>

            {statusMsg ? (
              <View style={styles.statusBox}>
                <Text style={{ textAlign: "center", color: "#333" }}>{statusMsg}</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

function NativeMap({ coords, centers }: { coords: Coords; centers: any[] }) {
  const MapStuff = useMemo(() => {
    const maps = require("react-native-maps");
    return { MapView: maps.default, Marker: maps.Marker };
  }, []);

  return (
    <View style={styles.mapContainer}>
      <MapStuff.MapView
        style={{ flex: 1 }}
        region={{
          latitude: coords.lat,
          longitude: coords.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
      >
        {centers.map((center, idx) => {
          const lat = center?.coordinates?.latitude;
          const lng = center?.coordinates?.longitude;
          if (typeof lat !== "number" || typeof lng !== "number") return null;

          return (
            <MapStuff.Marker
              key={center._id || `center-${idx}`}
              coordinate={{ latitude: lat, longitude: lng }}
              title={center.name || "Donation Center"}
              description={center.description || ""}
            />
          );
        })}
      </MapStuff.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDECEF" },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#F0C3D2",
  },
  cardTitle: { fontSize: 20, fontWeight: "800", color: "#333" },
  sectionHeader: { fontSize: 16, fontWeight: "700", color: "#333" },
  pointsText: { color: "#555" },
  primaryBtn: {
    backgroundColor: "#D81B60",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
  secondaryBtn: {
    backgroundColor: "#FDECEF",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0C3D2",
  },
  secondaryBtnText: { color: "#D81B60", fontWeight: "700" },
  mapContainer: {
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F0C3D2",
    marginBottom: 8,
  },
  webPlaceholder: {
    height: 120,
    borderRadius: 16,
    backgroundColor: "#EFE1EC",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { flex: 1, backgroundColor: "#FDECEF", padding: 16, paddingTop: 50 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20, alignItems: "center" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#333" },
  backBtn: { color: "#D81B60", fontWeight: "700", fontSize: 16 },
  previewImage: { width: "100%", height: 200, borderRadius: 12, marginTop: 10 },
  input: {
    backgroundColor: "#FDECEF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F0C3D2",
    color: "#333",
  },
  suggestionBox: {
    borderWidth: 1,
    borderColor: "#F0C3D2",
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 8,
  },
  suggestionItem: {
    padding: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#FDECEF",
  },
  stepTitle: { fontWeight: "800", color: "#333", marginBottom: 4 },
  statusBox: {
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0C3D2",
  },
  errorText: { color: "#C62828" },
});