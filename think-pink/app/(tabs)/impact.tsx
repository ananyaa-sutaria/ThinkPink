// app/(tabs)/impact.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  Linking,
} from "react-native";
import { useProgress } from "../../lib/progressContext";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { getOrCreateUserId } from "../../lib/userId";
import { getWalletAddress } from "../../lib/walletStore";
import { API_BASE } from "../../lib/api";
import type { PlaceSuggestion, PlaceDetails } from "../../lib/impactClient";
import { submitImpact } from "../../lib/impactClient";
import { useAuth } from "../../lib/AuthContext";

type NearbyCenter = {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  type?: "period" | "abortion" | "women";
  distanceKm?: number;
};

const SUPPORT_RESOURCES = [
  {
    id: "dv",
    title: "National Domestic Violence Hotline",
    detail: "Call 800-799-7233 or chat online",
    url: "https://www.thehotline.org/",
  },
  {
    id: "pp",
    title: "Planned Parenthood Health Center Finder",
    detail: "Find nearby reproductive health services",
    url: "https://www.plannedparenthood.org/health-center",
  },
  {
    id: "abortionfinder",
    title: "AbortionFinder",
    detail: "Search trusted abortion care providers",
    url: "https://www.abortionfinder.org/",
  },
  {
    id: "reprolegal",
    title: "Repro Legal Helpline",
    detail: "Legal rights + confidential support",
    url: "https://www.reprolegalhelpline.org/",
  },
];

export default function ImpactScreen() {
  const { points, addPoints } = useProgress();
  const { user } = useAuth();

  const [deviceUserId, setDeviceUserId] = useState("");
  const [wallet, setWallet] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [permDenied, setPermDenied] = useState(false);
  const [centers, setCenters] = useState<NearbyCenter[]>([]);

  const [photo, setPhoto] = useState<{ uri: string; name: string; type: string } | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [chosen, setChosen] = useState<PlaceDetails | null>(null);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [submissionsOpen, setSubmissionsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [donateOpen, setDonateOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const uid = await getOrCreateUserId();
      setDeviceUserId(uid);

      const w = await getWalletAddress();
      setWallet(w || "");

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setPermDenied(true);
        } else {
          setPermDenied(false);
          const loc = await Location.getCurrentPositionAsync({});
          setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!coords) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/impact/nearby-centers?lat=${coords.lat}&lng=${coords.lng}`, {
          headers: { "ngrok-skip-browser-warning": "true" },
        });
        const data = await res.json();
        if (data?.ok && Array.isArray(data?.centers)) setCenters(data.centers);
      } catch {}
    })();
  }, [coords?.lat, coords?.lng]);

  const submitUserId = (user as any)?.userId || (user as any)?.id || deviceUserId;

  async function loadMySubmissions() {
    const uid = submitUserId;
    if (!uid) return;

    try {
      const res = await fetch(`${API_BASE}/impact/mine/${uid}`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      const data = await res.json();
      if (data.ok) setMySubmissions(data.submissions || []);
    } catch {
      console.log("Failed to load submissions");
    }
  }

  useEffect(() => {
    loadMySubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitUserId]);

  useEffect(() => {
    if (!donateOpen) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }

    const t = setTimeout(async () => {
      setLoadingGeo(true);
      try {
        const suggestions = await fetchAutocomplete(q);
        setResults(suggestions);
      } catch (e: any) {
        setResults([]);
        setStatusMsg(e?.message || "Autocomplete failed");
      } finally {
        setLoadingGeo(false);
      }
    }, 300);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, donateOpen, coords?.lat, coords?.lng]);

  async function pickPhoto() {
    setStatusMsg("");

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setStatusMsg("Please allow photo library permissions.");
      return;
    }

    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (r.canceled) return;

    const uri = r.assets[0].uri;
    const name = uri.split("/").pop() || `donation_${Date.now()}.jpg`;
    setPhoto({ uri, name, type: "image/jpeg" });
  }

  async function fetchAutocomplete(q: string): Promise<PlaceSuggestion[]> {
    const res = await fetch(`${API_BASE}/impact/places-autocomplete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({
        query: q,
        near: coords ? { lat: coords.lat, lng: coords.lng } : undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Autocomplete failed");
    return (data?.suggestions || []) as PlaceSuggestion[];
  }

  async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails> {
    const res = await fetch(`${API_BASE}/impact/place-details`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({ placeId }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Place details failed");
    return data.place as PlaceDetails;
  }

  async function submit() {
    setStatusMsg("");

    if (!photo) return setStatusMsg("Pick a photo first.");
    if (!chosen) return setStatusMsg("Pick a donation location.");
    if (!submitUserId) return setStatusMsg("Missing userId.");

    setSubmitting(true);

    try {
      const form = new FormData();
      form.append("userId", submitUserId);
      form.append("walletAddress", wallet || "");
      form.append("locationName", chosen.name);
      form.append("locationLat", String(chosen.lat));
      form.append("locationLng", String(chosen.lng));
      form.append("photo", {
        uri: photo.uri,
        name: photo.name,
        type: photo.type,
      } as any);

      await submitImpact(form);
      await loadMySubmissions();

      setStatusMsg("Submitted for approval ✅");
      await addPoints(10);

      setPhoto(null);
      setChosen(null);
      setQuery("");
      setResults([]);
    } catch (e: any) {
      setStatusMsg(e?.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#FFF" }}
      contentContainerStyle={styles.content}
    >
      <View style={styles.card}>
        <Text style={styles.hint}>Find menstrual product donation centers near you and log your donations here</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.mapTitle}>Map</Text>

        {permDenied ? (
          <Text style={{ color: "#C62828" }}>
            Location permission denied. You can still log donations without map preview.
          </Text>
        ) : !coords ? (
          <Text style={styles.small}>Getting your location…</Text>
        ) : Platform.OS === "web" ? (
          <View style={styles.webMapPlaceholder}>
            <Text style={{ color: "#555" }}>Map preview is available on mobile.</Text>
          </View>
        ) : (
          <NativeMap coords={coords} centers={centers} />
        )}

      </View>

      <Pressable onPress={() => setDonateOpen(true)} style={[styles.primaryBtn, styles.mainCta]}>
        <Text style={styles.primaryText}>Log a Donation</Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Resources</Text>
        <Text style={styles.small}>Women-centered support and care resources</Text>
        {SUPPORT_RESOURCES.map((resource) => (
          <View key={resource.id} style={styles.resourceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.resourceTitle}>{resource.title}</Text>
              <Text style={styles.resourceDetail}>{resource.detail}</Text>
            </View>
            <Pressable
              onPress={() => Linking.openURL(resource.url)}
              style={styles.resourceBtn}
            >
              <Text style={styles.resourceBtnText}>Open</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <Modal visible={donateOpen} animationType="slide" onRequestClose={() => setDonateOpen(false)}>
        <View style={{ flexGrow: 1, backgroundColor: "#FFF", padding: 25, paddingTop: 40, paddingBottom: 80, justifyContent: "center" }}>
          <ScrollView style={{ maxHeight: "86%" }} contentContainerStyle={{ gap: 12, paddingBottom: 10 }}>
            <View style={styles.card}>
              <Text style={styles.title}>Impact</Text>
              <Text style={styles.sub}>Your points: {points}</Text>
              <Text style={styles.hint}>
                Submit a donation photo + location. We’ll verify and mint an on-chain Impact badge.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>1) Donation proof</Text>
              <Pressable onPress={pickPhoto} style={styles.primaryBtn}>
                <Text style={styles.primaryText}>{photo ? "Change photo" : "Upload donation photo"}</Text>
              </Pressable>
              {photo ? <Text style={styles.small}>Selected: {photo.name}</Text> : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>2) Donation location</Text>

              <TextInput
                value={query}
                onChangeText={(t) => {
                  setStatusMsg("");
                  setQuery(t);
                }}
                placeholder="Search + choose location"
                style={styles.input}
                autoCorrect={false}
                autoCapitalize="none"
              />

              {loadingGeo ? <Text style={styles.small}>Searching…</Text> : null}

              {chosen ? (
                <Text style={styles.small}>
                  Chosen: {chosen.name} ({chosen.address})
                </Text>
              ) : null}

              {query.trim().length < 2 ? (
                <Text style={styles.small}>Type at least 2 characters.</Text>
              ) : results.length === 0 && !loadingGeo ? (
                <Text style={styles.small}>No matches yet.</Text>
              ) : (
                results.map((r, idx) => (
                  <Pressable
                    key={r.placeId || String(idx)}
                    onPress={async () => {
                      try {
                        setStatusMsg("");
                        setLoadingGeo(true);
                        const place = await fetchPlaceDetails(r.placeId);
                        setChosen(place);
                        setQuery(place.address || place.name || "");
                        setResults([]);
                      } catch (e: any) {
                        setStatusMsg(e?.message || "Could not load place details");
                      } finally {
                        setLoadingGeo(false);
                      }
                    }}
                    style={styles.resultRow}
                  >
                    <Text style={{ color: "#333" }} numberOfLines={2}>
                      {r.description}
                    </Text>
                  </Pressable>
                ))
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>3) Submit for approval</Text>
              <Pressable onPress={submit} disabled={submitting} style={[styles.primaryBtn, submitting && { opacity: 0.7 }]}>
                <Text style={styles.primaryText}>{submitting ? "Submitting…" : "Submit proof"}</Text>
              </Pressable>

              {statusMsg ? <Text style={{ color: "#333", marginTop: 8 }}>{statusMsg}</Text> : null}

              <Text style={styles.small}>
                Privacy: We store your photo + location in Mongo for review. On-chain we only anchor a proof hash + mint
                a badge.
              </Text>
            </View>

            <View style={styles.card}>
              <Pressable
                onPress={() => setSubmissionsOpen((v) => !v)}
                style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
              >
                <Text style={styles.sectionTitle}>My submissions</Text>
                <Text style={{ color: "#BA5D84", fontWeight: "700" }}>{submissionsOpen ? "Hide" : "Show"}</Text>
              </Pressable>

              {submissionsOpen ? (
                <>
                  <Pressable onPress={loadMySubmissions} style={styles.secondaryBtn}>
                    <Text style={styles.secondaryText}>Refresh</Text>
                  </Pressable>

                  {mySubmissions.length === 0 ? (
                    <Text style={styles.small}>No submissions yet.</Text>
                  ) : (
                    mySubmissions.map((s) => (
                      <View key={s._id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3D0DB" }}>
                        <Text style={{ color: "#333" }}>{s.locationName}</Text>
                        <Text style={styles.small}>Status: {s.status}</Text>
                        {s.txMint ? <Text style={styles.small}>Mint tx: {String(s.txMint).slice(0, 18)}...</Text> : null}
                      </View>
                    ))
                  )}
                </>
              ) : null}
            </View>

            <Pressable onPress={() => setDonateOpen(false)} style={styles.backBtn}>
              <Text style={{ color: "#BA5D84" }}>Close</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

    </ScrollView>
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
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#ea9ab2",
    shadowColor: "#ea9ab2",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  title: { fontSize: 18, color: "#333", fontWeight: "800" },
  sub: { color: "#555" },
  hint: { color: "#555" },
  mapTitle: { color: "#333", fontSize: 32, fontFamily: "Onest-Bold" },
  sectionTitle: { color: "#333", fontWeight: "800" },
  primaryBtn: { backgroundColor: "#BA5D84", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  primaryText: { color: "#FFF", fontFamily: "Onest-Bold", fontSize: 20 },
  mainCta: { marginTop: 6 },
  secondaryBtn: { backgroundColor: "#FDECEF", borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  secondaryText: { color: "#333", fontWeight: "700" },
  small: { color: "#777", fontSize: 12 },
  input: { borderWidth: 1, borderColor: "#F48FB1", borderRadius: 12, padding: 12, backgroundColor: "#FFF" },
  resultRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3D0DB" },
  backBtn: { alignSelf: "flex-start", marginTop: 6 },
  resourceRow: {
    borderWidth: 1,
    borderColor: "#F3D0DB",
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  resourceTitle: { color: "#333", fontWeight: "700", fontSize: 13 },
  resourceDetail: { color: "#666", fontSize: 12, marginTop: 2 },
  resourceBtn: {
    backgroundColor: "#FDECEF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#F3D0DB",
  },
  resourceBtnText: { color: "#BA5D84", fontWeight: "700", fontSize: 12 },
  mapContainer: {
    height: 220,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F3D0DB",
    backgroundColor: "#EFE1EC",
  },
  map: { width: "100%", height: "100%" },
  webMapPlaceholder: {
    minHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F3D0DB",
    backgroundColor: "#EFE1EC",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
});

function NativeMap({ coords, centers }: { coords: { lat: number; lng: number }; centers: NearbyCenter[] }) {
  const MapStuff = useMemo(() => {
    const maps = require("react-native-maps");
    return {
      MapView: maps.default,
      Marker: maps.Marker,
    };
  }, []);

  const region = {
    latitude: coords.lat,
    longitude: coords.lng,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const MapView = MapStuff.MapView;
  const Marker = MapStuff.Marker;
  const pinColorFor = (type?: NearbyCenter["type"]) => {
    if (type === "abortion") return "#8E24AA";
    if (type === "women") return "#EC407A";
    return "#BA5D84";
  };

  return (
    <View style={styles.mapContainer}>
      <MapView style={styles.map} region={region} showsUserLocation>
        {centers.map((center, idx) => {
          const lat = center?.lat;
          const lng = center?.lng;
          if (typeof lat !== "number" || typeof lng !== "number") return null;
          return (
            <Marker
              key={center?.id || `center-${idx}`}
              coordinate={{ latitude: lat, longitude: lng }}
              title={center?.name || "Health center"}
              description={center?.address || ""}
              pinColor={pinColorFor(center?.type)}
            />
          );
        })}
      </MapView>
    </View>
  );
}
