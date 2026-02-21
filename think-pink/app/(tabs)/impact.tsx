// app/(tabs)/impact.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  Platform,
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


export default function ImpactScreen() {
  const { points, addPoints } = useProgress();
  const { user } = useAuth();
const [deviceUserId, setDeviceUserId] = useState("");
  const [wallet, setWallet] = useState("");

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [photo, setPhoto] = useState<{ uri: string; name: string; type: string } | null>(null);

  const [pickOpen, setPickOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [chosen, setChosen] = useState<PlaceDetails | null>(null);
  const [loadingGeo, setLoadingGeo] = useState(false);
    const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  

  useEffect(() => {
  (async () => {
    const uid = await getOrCreateUserId();
    setDeviceUserId(uid);

    const w = await getWalletAddress();
    setWallet(w || "");

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    } catch {}
  })();
}, []);
const submitUserId = (user as any)?.userId || (user as any)?.id || deviceUserId;
  // Autocomplete while typing (debounced)
  useEffect(() => {
  if (!user?.userId) return;

  async function loadMySubmissions() {
    try {
      const res = await fetch(
        `${API_BASE}/impact/mine/${user}`,
        { headers: { "ngrok-skip-browser-warning": "true" } }
      );

      const data = await res.json();
      if (data.ok) {
        setMySubmissions(data.submissions);
      }
    } catch (e) {
      console.log("Failed to load submissions");
    }
  }

  loadMySubmissions();
}, [user]);
  
  useEffect(() => {
    if (!pickOpen) return;

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
  }, [query, pickOpen, coords?.lat, coords?.lng]);

  async function pickPhoto() {
    setStatusMsg("");

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setStatusMsg("Please allow photo library permissions.");
      return;
    }

    const r = await ImagePicker.launchImageLibraryAsync({
      // keep this since your project is currently using it
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
async function loadMySubmissions() {
  const uid = submitUserId;
  if (!uid) return;

  const res = await fetch(`${API_BASE}/impact/mine/${uid}`, {
    headers: { "ngrok-skip-browser-warning": "true" },
  });
  const data = await res.json();
  if (data.ok) setMySubmissions(data.submissions || []);
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

    await submitImpact(form);  // ← ONLY this call
      loadMySubmissions();


    setStatusMsg("Submitted for approval ✅");
    await addPoints(10);

    setPhoto(null);
    setChosen(null);
    setQuery("");
    setResults([]);
    setPickOpen(false);

  } catch (e: any) {
    setStatusMsg(e?.message || "Submit failed");
  } finally {
    setSubmitting(false);
  }
}
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#FDECEF" }}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 110 }}
    >
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
        <Pressable
          onPress={() => {
            setStatusMsg("");
            setPickOpen(true);
          }}
          style={styles.secondaryBtn}
        >
          <Text style={styles.secondaryText}>{chosen ? "Change location" : "Search + choose location"}</Text>
        </Pressable>

        {chosen ? (
          <Text style={styles.small}>
            Chosen: {chosen.name} ({chosen.address})
          </Text>
        ) : null}

        {!coords ? (
          <Text style={styles.small}>Location not available (still works, just less accurate).</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>3) Submit for approval</Text>
        <Pressable
          onPress={submit}
          disabled={submitting}
          style={[styles.primaryBtn, submitting && { opacity: 0.7 }]}
        >
          <Text style={styles.primaryText}>{submitting ? "Submitting…" : "Submit proof"}</Text>
        </Pressable>

        {statusMsg ? <Text style={{ color: "#333", marginTop: 8 }}>{statusMsg}</Text> : null}

        <Text style={styles.small}>
          Privacy: We store your photo + location in Mongo for review. On-chain we only anchor a proof hash + mint a
          badge.
        </Text>
      </View>
      <View style={styles.card}>
  <Text style={styles.sectionTitle}>My submissions</Text>

  <Pressable
    onPress={async () => {
      try {
        const uid = (user as any)?.userId || (user as any)?.id || deviceUserId;
        if (!uid) return;

        const res = await fetch(`${API_BASE}/impact/mine/${uid}`, {
          headers: { "ngrok-skip-browser-warning": "true" },
        });
        const data = await res.json();
        if (data.ok) setMySubmissions(data.submissions || []);
      } catch {}
    }}
    style={styles.secondaryBtn}
  >
    <Text style={styles.secondaryText}>Refresh</Text>
  </Pressable>

  {mySubmissions.length === 0 ? (
    <Text style={styles.small}>No submissions yet.</Text>
  ) : (
    mySubmissions.map((s) => (
      <View
        key={s._id}
        style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3D0DB" }}
      >
        <Text style={{ color: "#333" }}>{s.locationName}</Text>
        <Text style={styles.small}>Status: {s.status}</Text>
        {s.txMint ? <Text style={styles.small}>Mint tx: {String(s.txMint).slice(0, 18)}...</Text> : null}
      </View>
    ))
  )}
</View>

      <Modal
        visible={pickOpen}
        animationType="slide"
        onRequestClose={() => setPickOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#FDECEF", padding: 16, gap: 12 }}>
          <View style={styles.card}>
            <Text style={styles.title}>Search location</Text>
            <Text style={styles.small}>Type a place name, shelter, school, or city.</Text>

            <TextInput
              value={query}
              onChangeText={(t) => {
                setStatusMsg("");
                setQuery(t);
              }}
              placeholder="e.g., Reitz Union"
              style={styles.input}
              autoCorrect={false}
              autoCapitalize="none"
            />

            {loadingGeo ? <Text style={styles.small}>Searching…</Text> : null}

            <Pressable
              onPress={() => {
                setPickOpen(false);
                setQuery("");
                setResults([]);
              }}
              style={styles.backBtn}
            >
              <Text style={{ color: "#D81B60" }}>Back</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Results</Text>

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
                      setPickOpen(false);
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

          {statusMsg ? (
            <View style={[styles.card, { padding: 12 }]}>
              <Text style={{ color: "#C62828" }}>{statusMsg}</Text>
            </View>
          ) : null}
        </View>
    
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFF", borderRadius: 20, padding: 16, gap: 10 },
  title: { fontSize: 18, color: "#333", fontWeight: "800" },
  sub: { color: "#555" },
  hint: { color: "#555" },
  sectionTitle: { color: "#333", fontWeight: "800" },
  primaryBtn: { backgroundColor: "#D81B60", borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  primaryText: { color: "#FFF", fontWeight: "700" },
  secondaryBtn: { backgroundColor: "#FDECEF", borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  secondaryText: { color: "#333", fontWeight: "700" },
  small: { color: "#777", fontSize: 12 },
  input: { borderWidth: 1, borderColor: "#F48FB1", borderRadius: 12, padding: 12, backgroundColor: "#FFF" },
  resultRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3D0DB" },
  backBtn: { alignSelf: "flex-start", marginTop: 6 },
});
