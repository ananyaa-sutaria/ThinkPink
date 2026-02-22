import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView, Image, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { getWalletAddress, setWalletAddress } from "../lib/walletStore";
import { useAuth } from "../lib/AuthContext";
import { getItem, setItem } from "../lib/storage";
import { API_BASE } from "../lib/api";
import { useProgress } from "../lib/progressContext";

export default function AccountScreen() {
  const router = useRouter();
  const { user, signOut, signIn } = useAuth?.() || ({} as any);
  const { cycleBadgeUnlocked, cycleBadgeMinted, impactBadgeUnlocked, impactBadgeMinted } = useProgress();

  const [username, setUsername] = useState<string>(user?.name || "");
  const [pronouns, setPronouns] = useState<string>((user as any)?.pronouns || "");
  const [wallet, setWallet] = useState<string>("");
  const [profilePhotoUri, setProfilePhotoUri] = useState<string>("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);

  const profilePhotoKey = `profile_photo:${(user as any)?.userId || (user as any)?.id || "guest"}`;

  useEffect(() => {
    (async () => {
      const w = await getWalletAddress();
      setWallet(w || user?.wallet || "");
      const p = await getItem(profilePhotoKey);
      setProfilePhotoUri(p || "");
    })();
  }, [user?.wallet, profilePhotoKey]);

  const shortWallet = useMemo(() => {
    if (!wallet) return "";
    return wallet.length > 8 ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}` : wallet;
  }, [wallet]);

  async function onSaveLocal() {
    await setWalletAddress(wallet.trim());
    Alert.alert("Saved", "Saved wallet locally ✅");
  }

  async function onSaveProfile() {
    const userId = (user as any)?.userId || (user as any)?.id;
    if (!userId) {
      Alert.alert("Error", "Missing userId.");
      return;
    }

    setSavingProfile(true);
    try {
      const payload: any = {
        userId,
        name: username.trim() || "User",
        pronouns: pronouns.trim(),
        wallet: wallet.trim(),
      };

      const res = await fetch(`${API_BASE}/api/users/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify(payload),
      });
      const raw = await res.text();
      let data: any = null;
      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {
          throw new Error(`Server returned non-JSON (status ${res.status})`);
        }
      }
      if (!res.ok) throw new Error(data?.error || `Failed to save profile (status ${res.status})`);

      await setWalletAddress(wallet.trim());
      if (signIn) {
        await signIn({
          userId,
          name: payload.name,
          wallet: payload.wallet,
          pronouns: payload.pronouns,
        });
      }
      Alert.alert("Saved", "Profile updated ✅");
    } catch (e: any) {
      Alert.alert("Save failed", e?.message || "Could not save profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function onSignOut() {
    try {
      if (signOut) signOut();
      router.replace("/login" as any);
    } catch (e) {
      console.log(e);
    }
  }

  async function onPickProfilePhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow photo library access.");
      return;
    }

    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (r.canceled) return;
    const uri = r.assets[0]?.uri || "";
    setProfilePhotoUri(uri);
    await setItem(profilePhotoKey, uri);
  }

  async function onUpdatePassword() {
    const userId = (user as any)?.userId || (user as any)?.id;
    if (!userId) {
      Alert.alert("Error", "Missing userId.");
      return;
    }
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert("Missing fields", "Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Password mismatch", "New password and confirm password must match.");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          userId,
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim(),
        }),
      });
      const raw = await res.text();
      let data: any = null;
      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {
          throw new Error(`Server returned non-JSON (status ${res.status})`);
        }
      }
      if (!res.ok) throw new Error(data?.error || `Could not update password (status ${res.status})`);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSecurityOpen(false);
      Alert.alert("Updated", "Password updated successfully ✅");
    } catch (e: any) {
      Alert.alert("Update failed", e?.message || "Could not update password.");
    } finally {
      setSavingPassword(false);
    }
  }

  const displayName = username.trim() || "User";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const earnedBadges = useMemo(() => {
    const list: string[] = [];
    if (cycleBadgeUnlocked || cycleBadgeMinted) list.push("Cycle Literacy Level 1");
    if (impactBadgeUnlocked || impactBadgeMinted) list.push("Period Equity Supporter");
    return list;
  }, [cycleBadgeUnlocked, cycleBadgeMinted, impactBadgeUnlocked, impactBadgeMinted]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.wrap}>
          <Text style={styles.header}>Account Settings</Text>

        <View style={styles.profileWrap}>
          <Pressable onPress={onPickProfilePhoto} style={styles.avatarCircle}>
            {profilePhotoUri ? (
              <Image source={{ uri: profilePhotoUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitials}>{initials || "U"}</Text>
            )}
          </Pressable>
          <Text style={styles.profileName}>{displayName}</Text>
          <Pressable onPress={onPickProfilePhoto} style={styles.photoBtn}>
            <Text style={styles.photoBtnText}>{profilePhotoUri ? "Change Photo" : "Upload Photo"}</Text>
          </Pressable>
          <View style={styles.badgesWrap}>
            {earnedBadges.length === 0 ? (
              <Text style={styles.badgesEmpty}>No badges yet</Text>
            ) : (
              <View style={styles.badgePillRow}>
                {earnedBadges.map((name) => (
                  <View key={name} style={styles.badgePill}>
                    <Text style={styles.badgePillText}>{name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Username</Text>
          <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Name" placeholderTextColor="#777" />

          <Text style={[styles.label, { marginTop: 15 }]}>Pronouns</Text>
          <TextInput
            style={styles.input}
            value={pronouns}
            onChangeText={setPronouns}
            placeholder="e.g., she/her"
            placeholderTextColor="#777"
          />

          <Pressable onPress={() => setSecurityOpen(true)} style={styles.securityBtn}>
            <Text style={styles.securityBtnText}>Security</Text>
          </Pressable>

          <Pressable onPress={onSaveProfile} style={styles.profileSaveBtn} disabled={savingProfile}>
            <Text style={styles.profileSaveText}>{savingProfile ? "Saving…" : "Save Profile"}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Pressable
            onPress={() => setWalletOpen((v) => !v)}
            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
          >
            <Text style={styles.label}>Solana Wallet</Text>
            <Text style={{ color: "#D81B60", fontSize: 12, fontWeight: "700" }}>
              {walletOpen ? "Hide" : "Show"}
            </Text>
          </Pressable>

          {walletOpen ? (
            <>
              <Text style={styles.subLabel}>Paste your Phantom / Solflare wallet address:</Text>
              <TextInput
                style={styles.input}
                placeholder="Your wallet address (base58)"
                autoCapitalize="none"
                autoCorrect={false}
                value={wallet}
                onChangeText={setWallet}
              />

              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <Pressable onPress={onSaveLocal} style={[styles.smallBtn, { backgroundColor: "#D81B60" }]}>
                  <Text style={[styles.smallBtnText, { color: "#FFF" }]}>Save</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <Text style={styles.subLabel}>{wallet ? `Saved: ${shortWallet}` : "No wallet saved"}</Text>
          )}
        </View>

        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={16} color="#D81B60" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <Pressable onPress={onSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
        </View>
      </ScrollView>

      <Modal visible={securityOpen} transparent animationType="fade" onRequestClose={() => setSecurityOpen(false)}>
        <View style={styles.securityOverlay}>
          <View style={styles.securityCard}>
            <Text style={styles.securityTitle}>Update Password</Text>

            <TextInput
              style={styles.input}
              placeholder="Current password"
              placeholderTextColor="#777"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="New password"
              placeholderTextColor="#777"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="Reconfirm new password"
              placeholderTextColor="#777"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable onPress={() => setSecurityOpen(false)} style={[styles.securityAction, styles.securityCancel]}>
                <Text style={styles.securityCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={onUpdatePassword} style={[styles.securityAction, styles.securitySave]} disabled={savingPassword}>
                <Text style={styles.securitySaveText}>{savingPassword ? "Saving…" : "Update"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  content: { padding: 20, paddingTop: 36, alignItems: "center", paddingBottom: 40 },
  wrap: { width: "100%", maxWidth: 520, alignItems: "center" },
  header: { fontSize: 24, fontWeight: "900", color: "#D81B60", marginBottom: 16, textAlign: "center" },
  profileWrap: { alignItems: "center", marginBottom: 14, gap: 8 },
  avatarCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "#F2B7CC",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D81B60",
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarInitials: { color: "#FFF", fontWeight: "900", fontSize: 34 },
  profileName: { color: "#2D2230", fontWeight: "800", fontSize: 16 },
  photoBtn: {
    backgroundColor: "#BA5D84",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  photoBtnText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  badgesWrap: {
    marginTop: 6,
    width: "100%",
    alignItems: "center",
    gap: 6,
  },
  badgesEmpty: {
    color: "#777",
    fontFamily: "Onest",
    fontSize: 12,
  },
  badgePillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  badgePill: {
    backgroundColor: "#FDECEF",
    borderWidth: 1,
    borderColor: "#ea9ab2",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  badgePillText: {
    color: "#A40E4C",
    fontFamily: "Onest-Bold",
    fontSize: 12,
  },
  profileSaveBtn: {
    marginTop: 14,
    backgroundColor: "#BA5D84",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  profileSaveText: { color: "#FFF", fontFamily: "Onest-Bold", fontSize: 16 },
  securityBtn: {
    marginTop: 14,
    backgroundColor: "#FDECEF",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F48FB1",
  },
  securityBtnText: { color: "#D81B60", fontFamily: "Onest-Bold", fontSize: 16 },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ea9ab2",
    shadowColor: "#ea9ab2",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
    padding: 15,
    marginBottom: 15,
    width: "100%",
  },
  label: { fontWeight: "700", marginBottom: 6, color: "#333" },
  subLabel: { color: "#555", marginBottom: 8 },

  input: {
    borderWidth: 1,
    borderColor: "#F48FB1",
    borderRadius: 10,
    padding: 12,
    color: "#000",
    backgroundColor: "#FFF",
  },

  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  smallBtnText: { fontWeight: "700" },

  signOutButton: { marginTop: 10, padding: 10, alignItems: "center" },
  signOutText: { color: "#D81B60", fontWeight: "800", fontSize: 16 },

  backButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
  },
  backText: { color: "#D81B60", fontWeight: "800" },
  securityOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.32)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  securityCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ea9ab2",
    padding: 16,
    gap: 10,
  },
  securityTitle: { color: "#2D2230", fontFamily: "Onest-Bold", fontSize: 20, marginBottom: 4, textAlign: "center" },
  securityAction: { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: "center" },
  securityCancel: { backgroundColor: "#FDECEF", borderWidth: 1, borderColor: "#F48FB1" },
  securitySave: { backgroundColor: "#BA5D84" },
  securityCancelText: { color: "#D81B60", fontFamily: "Onest-Bold" },
  securitySaveText: { color: "#FFF", fontFamily: "Onest-Bold" },
});
