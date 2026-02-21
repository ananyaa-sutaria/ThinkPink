import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useProgress } from "../../lib/progressContext";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { Image, TextInput, Modal, ScrollView } from "react-native";
import { getOrCreateUserId } from "../../lib/userId";
import { placesAutocomplete, placeDetails, submitDonation } from "../../lib/impactClient";

type Coords = { latitude: number; longitude: number };

export default function ImpactScreen() {
  const { points } = useProgress();
  const [coords, setCoords] = useState<Coords | null>(null);
  const [permDenied, setPermDenied] = useState(false);

  const isWeb = Platform.OS === "web";
  const [open, setOpen] = useState(false);
const [imageUri, setImageUri] = useState<string | null>(null);

const [query, setQuery] = useState("");
const [suggestions, setSuggestions] = useState<any[]>([]);
const [selectedPlace, setSelectedPlace] = useState<any | null>(null);

const [submitting, setSubmitting] = useState(false);
const [statusMsg, setStatusMsg] = useState("");
async function pickImage() {
  setStatusMsg("");
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    setStatusMsg("Photos permission denied.");
    return;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });
  if (result.canceled) return;
  setImageUri(result.assets[0].uri);
}

async function searchPlaces(text: string) {
  setQuery(text);
  setSelectedPlace(null);

  if (text.trim().length < 3) {
    setSuggestions([]);
    return;
  }

  try {
    const near = coords ? { lat: coords.latitude, lng: coords.longitude } : undefined;
    const r = await placesAutocomplete({ query: text.trim(), near });
    setSuggestions(r.suggestions);
  } catch (e: any) {
    setSuggestions([]);
    setStatusMsg(e?.message || "Search failed");
  }
}

async function choosePlace(placeId: string) {
  setStatusMsg("");
  setSuggestions([]);
  try {
    const r = await placeDetails(placeId);
    setSelectedPlace(r.place);
    setQuery(`${r.place.name} — ${r.place.address}`);
  } catch (e: any) {
    setStatusMsg(e?.message || "Couldn’t load place");
  }
}

async function onSubmitDonation() {
  if (!imageUri) return setStatusMsg("Please pick a photo.");
  if (!selectedPlace) return setStatusMsg("Please choose a location.");

  setSubmitting(true);
  setStatusMsg("");
  try {
    const userId = await getOrCreateUserId();
    await submitDonation({ userId, imageUrl: imageUri, place: selectedPlace });
    setStatusMsg("Submitted for approval ✅");
    setImageUri(null);
    setSelectedPlace(null);
    setQuery("");
  } catch (e: any) {
    setStatusMsg(e?.message || "Submit failed");
  } finally {
    setSubmitting(false);
  }
}


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

  return (
    <><View style={{ flex: 1, backgroundColor: "#FDECEF", padding: 16, gap: 12 }}>
          <View style={{ backgroundColor: "#FFF", borderRadius: 20, padding: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#333" }}>Impact</Text>
              <Text style={{ color: "#555", marginTop: 4 }}>Your points: {points}</Text>
          </View>

          <View style={{ backgroundColor: "#FFF", borderRadius: 20, padding: 16, gap: 10 }}>
              <Text style={{ color: "#333", fontWeight: "800" }}>Map</Text>

              {permDenied ? (
                  <Text style={{ color: "#C62828" }}>
                      Location permission denied. You can still use the app without the map.
                  </Text>
              ) : !coords ? (
                  <Text style={{ color: "#555" }}>Getting your location…</Text>
              ) : isWeb ? (
                  <View style={styles.webMapPlaceholder}>
                      <Text style={{ color: "#555" }}>
                          Map preview is available on mobile only (Expo web doesn’t support react-native-maps).
                      </Text>
                  </View>
              ) : (
                  <NativeMap coords={coords} />
              )}

              <Pressable onPress={() => setOpen(true)} style={styles.primaryBtn}>
                  <Text style={styles.primaryText}>Upload donation photo</Text>
              </Pressable>
          </View>
      </View><Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
              <View style={{ flex: 1, backgroundColor: "#FDECEF", padding: 16, gap: 12 }}>
                  <View style={{ backgroundColor: "#FFF", borderRadius: 20, padding: 16, gap: 8 }}>
                      <Text style={{ fontSize: 18, fontWeight: "800", color: "#333" }}>Submit Donation</Text>
                      <Text style={{ color: "#555" }}>
                          Upload a photo and select the donation location. Submissions are marked pending.
                      </Text>
                  </View>

                  <View style={{ backgroundColor: "#FFF", borderRadius: 20, padding: 16, gap: 10 }}>
                      <Pressable onPress={pickImage} style={styles.primaryBtn}>
                          <Text style={styles.primaryText}>{imageUri ? "Change photo" : "Pick a photo"}</Text>
                      </Pressable>

                      {imageUri ? (
                          <Image
                              source={{ uri: imageUri }}
                              style={{ width: "100%", height: 220, borderRadius: 16, backgroundColor: "#FDECEF" }}
                              resizeMode="cover" />
                      ) : null}

                      <Text style={{ color: "#333", fontWeight: "800", marginTop: 4 }}>Donation location</Text>
                      <TextInput
                          value={query}
                          onChangeText={searchPlaces}
                          placeholder="Search: 'UF pantry' or 'donation center'…"
                          style={{
                              backgroundColor: "#FDECEF",
                              borderRadius: 14,
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              borderWidth: 1,
                              borderColor: "#F0C3D2",
                          }} />

                      {suggestions.length > 0 ? (
                          <View style={{ borderWidth: 1, borderColor: "#F0C3D2", borderRadius: 14, overflow: "hidden" }}>
                              {suggestions.map((s) => (
                                  <Pressable
                                      key={s.placeId}
                                      onPress={() => choosePlace(s.placeId)}
                                      style={{ padding: 12, backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#FDECEF" }}
                                  >
                                      <Text style={{ color: "#333" }}>{s.description}</Text>
                                  </Pressable>
                              ))}
                          </View>
                      ) : null}

                      <Pressable
                          onPress={onSubmitDonation}
                          disabled={submitting}
                          style={[styles.primaryBtn, { opacity: submitting ? 0.7 : 1 }]}
                      >
                          <Text style={styles.primaryText}>{submitting ? "Submitting…" : "Submit for approval"}</Text>
                      </Pressable>

                      {statusMsg ? (
                          <View style={{ backgroundColor: "#FFF", padding: 12, borderRadius: 16, borderWidth: 1, borderColor: "#F0C3D2" }}>
                              <Text style={{ color: "#333" }}>{statusMsg}</Text>
                          </View>
                      ) : null}

                      <Pressable onPress={() => setOpen(false)} style={{ paddingVertical: 10, alignItems: "center" }}>
                          <Text style={{ color: "#D81B60", fontWeight: "700" }}>Close</Text>
                      </Pressable>
                  </View>
              </View>
          </Modal></>
    
    
  );
}

/**
 * IMPORTANT:
 * - No top-level import from react-native-maps anywhere.
 * - Only require it at runtime AND only on native.
 */

function NativeMap({ coords }: { coords: Coords }) {
  const MapStuff = useMemo(() => {
    // require only runs on native because this component never renders on web
    const maps = require("react-native-maps");
    return {
      MapView: maps.default,
      Marker: maps.Marker,
    };
  }, []);

  const region = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const MapView = MapStuff.MapView;
  const Marker = MapStuff.Marker;

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