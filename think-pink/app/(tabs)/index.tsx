import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Calendar } from "react-native-calendars";

import { API_BASE } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { useProgress } from "../../lib/progressContext";
import { getItem, setItem } from "../../lib/storage";
import { getOrCreateUserId } from "../../lib/userId";

// Types you likely already store
type Phase = "menstrual" | "follicular" | "ovulation" | "luteal";

type CycleLog = {
  userId: string;
  dateISO: string; // YYYY-MM-DD
  phase?: Phase;
  cycleDay?: number;
  periodStart?: boolean;
  periodEnd?: boolean;
  spotting?: boolean;
  symptoms?: string | string[];
  notes?: string;
};

type Medication = {
  id: string;
  name: string;
  schedule?: string;
};

const CYCLE_LENGTH_DAYS = 28;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const STREAK_DAYS_TARGET = 10;
const STREAK_BONUS_POINTS = 50;
const SYMPTOM_OPTIONS = ["Nausea", "Acne", "Bloating", "Stomach pain", "Hot flash"];
const MED_SCHEDULE_OPTIONS = ["Morning", "Afternoon", "Evening", "Bedtime"];

function isoToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toUtcMs(iso: string) {
  const [y, m, d] = iso.split("-").map((x) => Number(x));
  return Date.UTC(y, m - 1, d);
}

function diffDays(fromISO: string, toISO: string) {
  return Math.floor((toUtcMs(toISO) - toUtcMs(fromISO)) / MS_PER_DAY);
}

function addDaysISO(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map((x) => Number(x));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function medicationTakenKey(uid: string, dateISO: string) {
  return `medications:taken:${uid}:${dateISO}`;
}

function streakRewardKey(uid: string, streakEndISO: string, streakDays: number) {
  return `logs:streak-reward:${uid}:${streakEndISO}:${streakDays}`;
}

function computePeriodDays(logs: Record<string, CycleLog>, todayISO: string) {
  const starts = Object.values(logs)
    .filter((l) => l.periodStart && l.dateISO)
    .map((l) => l.dateISO)
    .sort();
  const ends = Object.values(logs)
    .filter((l) => l.periodEnd && l.dateISO)
    .map((l) => l.dateISO)
    .sort();

  const out = new Set<string>();

  for (let i = 0; i < starts.length; i += 1) {
    const start = starts[i];
    const nextStart = starts[i + 1];
    const end = ends.find((e) => e >= start && (!nextStart || e < nextStart));
    const rangeEnd = end || (!nextStart && start <= todayISO ? todayISO : start);
    if (rangeEnd < start) continue;

    let cursor = start;
    let safety = 0;
    while (cursor <= rangeEnd && safety < 90) {
      out.add(cursor);
      cursor = addDaysISO(cursor, 1);
      safety += 1;
    }
  }

  return out;
}

function computeExpectedNextPeriodDays(logs: Record<string, CycleLog>, todayISO: string) {
  const starts = Object.values(logs)
    .filter((l) => l.periodStart && l.dateISO)
    .map((l) => l.dateISO)
    .sort();
  const ends = Object.values(logs)
    .filter((l) => l.periodEnd && l.dateISO)
    .map((l) => l.dateISO)
    .sort();

  if (starts.length === 0) return new Set<string>();

  const cycleLengths: number[] = [];
  for (let i = 1; i < starts.length; i += 1) {
    const len = diffDays(starts[i - 1], starts[i]);
    if (len >= 18 && len <= 45) cycleLengths.push(len);
  }
  const avgCycle = cycleLengths.length
    ? Math.round(cycleLengths.reduce((sum, n) => sum + n, 0) / cycleLengths.length)
    : CYCLE_LENGTH_DAYS;
  const cycleLen = Math.min(35, Math.max(21, avgCycle));

  const periodDurations: number[] = [];
  for (let i = 0; i < starts.length; i += 1) {
    const start = starts[i];
    const nextStart = starts[i + 1];
    const end = ends.find((e) => e >= start && (!nextStart || e < nextStart));
    if (!end) continue;
    const days = diffDays(start, end) + 1;
    if (days >= 1 && days <= 10) periodDurations.push(days);
  }
  const avgDuration = periodDurations.length
    ? Math.round(periodDurations.reduce((sum, n) => sum + n, 0) / periodDurations.length)
    : 5;
  const duration = Math.min(8, Math.max(3, avgDuration));

  let expectedStart = addDaysISO(starts[starts.length - 1], cycleLen);
  while (expectedStart < todayISO) {
    expectedStart = addDaysISO(expectedStart, cycleLen);
  }

  const out = new Set<string>();
  for (let i = 0; i < duration; i += 1) {
    out.add(addDaysISO(expectedStart, i));
  }
  return out;
}

function buildPeriodMarks(
  dates: Set<string>,
  color: string,
  textColor = "#250921"
): Record<string, { color: string; textColor: string; startingDay?: boolean; endingDay?: boolean }> {
  const out: Record<string, { color: string; textColor: string; startingDay?: boolean; endingDay?: boolean }> = {};
  const sorted = Array.from(dates).sort();
  if (sorted.length === 0) return out;

  let rangeStart = sorted[0];
  let prev = sorted[0];

  const commitRange = (start: string, end: string) => {
    let cursor = start;
    while (cursor <= end) {
      out[cursor] = {
        color,
        textColor,
        startingDay: cursor === start,
        endingDay: cursor === end,
      };
      cursor = addDaysISO(cursor, 1);
    }
  };

  for (let i = 1; i < sorted.length; i += 1) {
    const cur = sorted[i];
    if (diffDays(prev, cur) !== 1) {
      commitRange(rangeStart, prev);
      rangeStart = cur;
    }
    prev = cur;
  }
  commitRange(rangeStart, prev);

  return out;
}

function deriveCycleForDate(dateISO: string, logs: Record<string, CycleLog>, periodDays: Set<string>) {
  const startDates = Object.values(logs)
    .filter((l) => l.periodStart && l.dateISO <= dateISO)
    .map((l) => l.dateISO)
    .sort();
  const latestStart = startDates[startDates.length - 1];
  const rawCycleDay = latestStart ? diffDays(latestStart, dateISO) + 1 : undefined;
  const cycleDay =
    rawCycleDay && rawCycleDay > 0 ? ((rawCycleDay - 1) % CYCLE_LENGTH_DAYS) + 1 : undefined;

  let phase: Phase = "luteal";
  if (periodDays.has(dateISO)) {
    phase = "menstrual";
  } else if (!cycleDay) {
    phase = "luteal";
  } else if (cycleDay <= 13) {
    phase = "follicular";
  } else if (cycleDay === 14) {
    phase = "ovulation";
  } else {
    phase = "luteal";
  }

  return { cycleDay, phase };
}

function countConsecutiveLoggedDays(logs: Record<string, CycleLog>, endDateISO: string) {
  function hasStreakSignal(log?: CycleLog) {
    if (!log) return false;
    const symptomCount = Array.isArray(log.symptoms)
      ? log.symptoms.length
      : typeof log.symptoms === "string"
      ? log.symptoms
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean).length
      : 0;
    return !!(log.periodStart || log.periodEnd || log.spotting || symptomCount > 0);
  }

  let streak = 0;
  let cursor = endDateISO;
  let safety = 0;

  while (hasStreakSignal(logs[cursor]) && safety < 400) {
    streak += 1;
    cursor = addDaysISO(cursor, -1);
    safety += 1;
  }

  return streak;
}

export default function Home() {
  const { user } = useAuth();
  const { addPoints } = useProgress();

  const [deviceUserId, setDeviceUserId] = useState("");
  const userId = (user as any)?.userId || (user as any)?.id || deviceUserId;

  const [loading, setLoading] = useState(false);
  const [logsByDate, setLogsByDate] = useState<Record<string, CycleLog>>({});
  const [selectedDate, setSelectedDate] = useState<string>(isoToday());

  const [logOpen, setLogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [streakNotice, setStreakNotice] = useState("");

  const [periodStart, setPeriodStart] = useState(false);
  const [periodEnd, setPeriodEnd] = useState(false);
  const [spotting, setSpotting] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medOpen, setMedOpen] = useState(false);
  const [medName, setMedName] = useState("");
  const [selectedMedSchedule, setSelectedMedSchedule] = useState<string[]>([]);
  const [medErr, setMedErr] = useState("");
  const [takenTodayByMedId, setTakenTodayByMedId] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const uid = await getOrCreateUserId();
      setDeviceUserId(uid);
    })();
  }, []);

  // load recent logs
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await fetch(`${API_BASE}/logs/recent?userId=${encodeURIComponent(userId)}&limit=120`, {
          headers: { "ngrok-skip-browser-warning": "true" },
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data?.error || "Failed to load logs");

        const logs: CycleLog[] = (data?.logs || []) as CycleLog[];
        const map: Record<string, CycleLog> = {};
        for (const l of logs) {
          if (l?.dateISO) map[l.dateISO] = l;
        }

        if (!cancelled) setLogsByDate(map);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Failed to load logs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      const raw = await getItem(`medications:${userId}`);
      if (cancelled) return;

      if (!raw) {
        setMedications([]);
        return;
      }

      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setMedications(
            parsed.filter((m) => m && typeof m.id === "string" && typeof m.name === "string")
          );
        } else {
          setMedications([]);
        }
      } catch {
        setMedications([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      const raw = await getItem(medicationTakenKey(userId, isoToday()));
      if (cancelled) return;

      if (!raw) {
        setTakenTodayByMedId({});
        return;
      }

      try {
        const parsed = JSON.parse(raw);
        setTakenTodayByMedId(parsed && typeof parsed === "object" ? parsed : {});
      } catch {
        setTakenTodayByMedId({});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function persistMedications(next: Medication[]) {
    if (!userId) return;
    setMedications(next);
    await setItem(`medications:${userId}`, JSON.stringify(next));
  }

  async function addMedication() {
    if (!userId) {
      setMedErr("Missing userId (log in).");
      return;
    }

    const name = medName.trim();
    const schedule = selectedMedSchedule.join(", ");

    if (!name) {
      setMedErr("Medication name is required.");
      return;
    }

    const next: Medication[] = [
      ...medications,
      { id: `med_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, name, schedule: schedule || undefined },
    ];
    await persistMedications(next);
    setMedName("");
    setSelectedMedSchedule([]);
    setMedErr("");
    setMedOpen(false);
  }

  async function removeMedication(id: string) {
    const next = medications.filter((m) => m.id !== id);
    await persistMedications(next);
  }

  async function markMedicationTakenToday(medId: string) {
    if (!userId) return;
    if (takenTodayByMedId[medId]) return;

    const next = { ...takenTodayByMedId, [medId]: true };
    setTakenTodayByMedId(next);
    await setItem(medicationTakenKey(userId, isoToday()), JSON.stringify(next));
    await addPoints(10);
  }

  // when date changes, populate modal fields
  useEffect(() => {
    const l = logsByDate[selectedDate];
    setPeriodStart(!!l?.periodStart);
    setPeriodEnd(!!l?.periodEnd);
    setSpotting(!!l?.spotting);
    const parsedSymptoms = Array.isArray(l?.symptoms)
      ? l.symptoms.map((s) => String(s).trim()).filter(Boolean)
      : typeof l?.symptoms === "string"
      ? l.symptoms
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    setSelectedSymptoms(parsedSymptoms);
    setNotes(l?.notes || "");
  }, [selectedDate, logsByDate]);

  function toggleSymptom(symptom: string) {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  }

  function toggleMedicationSchedule(slot: string) {
    setSelectedMedSchedule((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  }

  const todayISO = isoToday();
  const periodDays = useMemo(() => computePeriodDays(logsByDate, todayISO), [logsByDate, todayISO]);
  const expectedNextPeriodDays = useMemo(
    () => computeExpectedNextPeriodDays(logsByDate, todayISO),
    [logsByDate, todayISO]
  );
  const currentStreak = useMemo(() => countConsecutiveLoggedDays(logsByDate, todayISO), [logsByDate, todayISO]);
  const daysUntilStreakBonus = Math.max(0, STREAK_DAYS_TARGET - currentStreak);

  // calendar markings (color coding)
  const markedDates = useMemo(() => {
    const out: Record<string, any> = buildPeriodMarks(expectedNextPeriodDays, "#FCE9F2");

    const periodMarks = buildPeriodMarks(periodDays, "#F7B7CC");
    for (const [dateISO, mark] of Object.entries(periodMarks)) {
      out[dateISO] = mark;
    }

    out[todayISO] = {
      ...(out[todayISO] || {}),
      color: "#C7547F",
      textColor: "#FFFFFF",
      startingDay: true,
      endingDay: true,
    };

    for (const [dateISO, log] of Object.entries(logsByDate)) {
      if (!log?.spotting) continue;
      out[dateISO] = {
        ...(out[dateISO] || {}),
        marked: true,
        dotColor: "#A33572",
      };
    }

    return out;
  }, [logsByDate, periodDays, expectedNextPeriodDays, todayISO]);

  async function saveLog() {
    if (!userId) {
      setErr("Missing userId (log in).");
      return;
    }
    setSaving(true);
    setErr("");
    setStreakNotice("");

    try {
      const draft: CycleLog = {
        userId,
        dateISO: selectedDate,
        periodStart,
        periodEnd,
        spotting,
        symptoms: selectedSymptoms.length ? selectedSymptoms : undefined,
        notes: notes.trim() || undefined,
      };
      const nextLogs = { ...logsByDate, [selectedDate]: { ...logsByDate[selectedDate], ...draft } };
      const nextPeriodDays = computePeriodDays(nextLogs, todayISO);
      const derived = deriveCycleForDate(selectedDate, nextLogs, nextPeriodDays);

      const payload: CycleLog = {
        ...draft,
        phase: derived.phase,
        cycleDay: derived.cycleDay,
      };

      const res = await fetch(`${API_BASE}/logs/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");

      const saved: CycleLog = data?.log;
      const mergedLogs = { ...logsByDate, [saved.dateISO]: { ...payload, ...saved } };
      setLogsByDate(mergedLogs);

      const qualifiesForStreak =
        !!saved.periodStart ||
        !!saved.periodEnd ||
        !!saved.spotting ||
        (Array.isArray(saved.symptoms)
          ? saved.symptoms.length > 0
          : typeof saved.symptoms === "string"
          ? saved.symptoms
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean).length > 0
          : false);

      if (qualifiesForStreak) {
        const streak = countConsecutiveLoggedDays(mergedLogs, saved.dateISO);
        if (streak === STREAK_DAYS_TARGET) {
          const rewardKey = streakRewardKey(userId, saved.dateISO, STREAK_DAYS_TARGET);
          const alreadyAwarded = await getItem(rewardKey);
          if (!alreadyAwarded) {
            await addPoints(STREAK_BONUS_POINTS);
            await setItem(rewardKey, "1");
            setStreakNotice(`Streak bonus earned: +${STREAK_BONUS_POINTS} points`);
          }
        }
      }

      setLogOpen(false);
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // top card content (today summary)
  const todayCycle = deriveCycleForDate(todayISO, logsByDate, periodDays);
  const todayPhase = todayCycle.phase;
  const todayCycleDay = todayCycle.cycleDay;
  const progressWidth = todayCycleDay ? Math.max(12, (todayCycleDay / CYCLE_LENGTH_DAYS) * 200) : 12;
  const phaseIcon =
    todayPhase === "luteal"
      ? "☾"
      : todayPhase === "follicular"
      ? "◐"
      : todayPhase === "ovulation"
      ? "◉"
      : "●";

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {/* Phase Section */}
      <View style={styles.phase}>
        <View style={styles.phaseHeader}>
          <View style={styles.phaseText}>
            <View style={styles.phaseTitleRow}>
              <Text style={styles.phaseTitle}>Today: {capitalize(todayPhase)}</Text>
              <Text style={styles.phaseIcon}>{phaseIcon}</Text>
            </View>
            <Text style={styles.cycleDay}>Cycle Day {todayCycleDay ?? "—"}</Text>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakBadgeTop}>Streak</Text>
            <Text style={styles.streakBadgeNum}>{currentStreak}</Text>
          </View>
        </View>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.streakMetaInline}>
          {daysUntilStreakBonus === 0
            ? "10-day streak reached"
            : `${daysUntilStreakBonus} day${daysUntilStreakBonus === 1 ? "" : "s"} until +${STREAK_BONUS_POINTS}`}
        </Text>
        {streakNotice ? <Text style={styles.streakNotice}>{streakNotice}</Text> : null}

        <View style={styles.phaseNote}>
          <Text style={styles.noteText}>
            {todayPhase === "luteal"
              ? "Cravings and bloating can show up. Try magnesium + warm meals."
              : todayPhase === "follicular"
              ? "Energy often rises. Great day for protein + fresh foods."
              : todayPhase === "ovulation"
              ? "You may feel more social/energetic. Hydrate and fuel well."
              : "Rest, warm foods, and gentle movement can help."}
          </Text>
        </View>
      </View>

      {/* Calendar Section */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Calendar</Text>

          <Pressable
            onPress={() => {
              setSelectedDate(isoToday());
              setLogOpen(true);
            }}
            style={{ paddingHorizontal: 6, paddingVertical: 4 }}
          >
            <Image
              source={require("../../components/icons/Vector.png")}
              style={styles.addIcon}
              resizeMode="contain"
            />
          </Pressable>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 18 }}>
            <ActivityIndicator />
            <Text style={{ marginTop: 8, color: "#555" }}>Loading logs…</Text>
          </View>
        ) : (
          <Calendar
            onDayPress={(day) => {
              setSelectedDate(day.dateString);
              setLogOpen(true);
            }}
            markingType="period"
            markedDates={markedDates}
            theme={{
              backgroundColor: "#ffffff",
              calendarBackground: "#ffffff",
              todayTextColor: "#C7547F",
              arrowColor: "#C7547F",
              monthTextColor: "#250921",
              textDayFontFamily: "Onest",
              textMonthFontFamily: "Onest-Bold",
              textDayHeaderFontFamily: "Onest",
            }}
            style={styles.calendar}
          />
        )}

        {err ? (
          <View style={{ backgroundColor: "#FFF", marginTop: 10 }}>
            <Text style={{ color: "#C62828" }}>{err}</Text>
          </View>
        ) : null}

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: "#F7B7CC" }]} />
            <Text style={styles.legendText}>Period</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: "#FCE9F2" }]} />
            <Text style={styles.legendText}>Expected</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: "#C7547F" }]} />
            <Text style={styles.legendText}>Today</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#A33572" }]} />
            <Text style={styles.legendText}>Spotting</Text>
          </View>
        </View>
      </View>

      {/* Medications Section */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Medications</Text>
          <Pressable
            onPress={() => {
              setMedName("");
              setSelectedMedSchedule([]);
              setMedErr("");
              setMedOpen(true);
            }}
            style={{ paddingHorizontal: 6, paddingVertical: 4 }}
          >
            <Image
              source={require("../../components/icons/Vector.png")}
              style={styles.addIcon}
              resizeMode="contain"
            />
          </Pressable>
        </View>

        {medications.length === 0 ? (
          <Text style={styles.medEmpty}>No medications yet. Tap + to add one.</Text>
        ) : (
          medications.map((med) => (
            <View key={med.id} style={styles.medItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.medName}>{med.name}</Text>
                <Text style={styles.medTime}>{med.schedule || "Schedule not set"}</Text>
                <Pressable
                  onPress={() => markMedicationTakenToday(med.id)}
                  disabled={!!takenTodayByMedId[med.id]}
                  style={[
                    styles.takenButton,
                    takenTodayByMedId[med.id] ? styles.takenButtonDone : styles.takenButtonActive,
                  ]}
                >
                  <Text style={styles.takenButtonText}>
                    {takenTodayByMedId[med.id] ? "Taken today ✓" : "Taken today (+10)"}
                  </Text>
                </Pressable>
              </View>
              <Pressable onPress={() => removeMedication(med.id)} style={styles.removeButton}>
                <Text style={styles.removeButtonText}>Remove</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      {/* Log Modal */}
      <Modal visible={logOpen} animationType="slide" onRequestClose={() => setLogOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "#FFF", padding: 16, gap: 12, justifyContent: "center" }}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Log day</Text>
            <Text style={{ color: "#555" }}>{selectedDate}</Text>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <TogglePill label="Period start" active={periodStart} onPress={() => setPeriodStart((v) => !v)} />
              <TogglePill label="Period end" active={periodEnd} onPress={() => setPeriodEnd((v) => !v)} />
              <TogglePill label="Spotting" active={spotting} onPress={() => setSpotting((v) => !v)} />
            </View>

            <View style={styles.symptomList}>
              {SYMPTOM_OPTIONS.map((symptom) => {
                const active = selectedSymptoms.includes(symptom);
                return (
                  <Pressable
                    key={symptom}
                    onPress={() => toggleSymptom(symptom)}
                    style={[styles.symptomOption, active && styles.symptomOptionActive]}
                  >
                    <View style={[styles.checkbox, active && styles.checkboxActive]} />
                    <Text style={[styles.symptomText, active && styles.symptomTextActive]}>{symptom}</Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes (optional)"
              placeholderTextColor="#666"
              style={[styles.input, { height: 90 }]}
              multiline
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => setLogOpen(false)}
                style={{ flex: 1, backgroundColor: "#FDECEF", padding: 12, borderRadius: 16, alignItems: "center" }}
              >
                <Text style={{ color: "#333" }}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={saveLog}
                disabled={saving}
                style={{
                  flex: 1,
                  backgroundColor: saving ? "#F48FB1" : "#BA5D84",
                  padding: 12,
                  borderRadius: 16,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#FFF" }}>{saving ? "Saving…" : "Save"}</Text>
              </Pressable>
            </View>

            {err ? <Text style={{ color: "#C62828" }}>{err}</Text> : null}
          </View>
        </View>
      </Modal>

      {/* Medications Modal */}
      <Modal visible={medOpen} animationType="slide" onRequestClose={() => setMedOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "#FFF", padding: 16, gap: 12, justifyContent: "center" }}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add medication</Text>
            <TextInput
              value={medName}
              onChangeText={setMedName}
              placeholder="Medication name"
              placeholderTextColor="#666"
              style={styles.input}
            />
            <View style={styles.scheduleList}>
              {MED_SCHEDULE_OPTIONS.map((slot) => {
                const active = selectedMedSchedule.includes(slot);
                return (
                  <Pressable
                    key={slot}
                    onPress={() => toggleMedicationSchedule(slot)}
                    style={[styles.scheduleOption, active && styles.scheduleOptionActive]}
                  >
                    <View style={[styles.checkbox, active && styles.checkboxActive]} />
                    <Text style={[styles.symptomText, active && styles.symptomTextActive]}>{slot}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => setMedOpen(false)}
                style={{ flex: 1, backgroundColor: "#FDECEF", padding: 12, borderRadius: 16, alignItems: "center" }}
              >
                <Text style={{ color: "#333" }}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={addMedication}
                style={{ flex: 1, backgroundColor: "#BA5D84", padding: 12, borderRadius: 16, alignItems: "center" }}
              >
                <Text style={{ color: "#FFF" }}>Add</Text>
              </Pressable>
            </View>

            {medErr ? <Text style={{ color: "#C62828" }}>{medErr}</Text> : null}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function TogglePill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: active ? "#2E7D32" : "#FDECEF",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
      }}
    >
      <Text style={{ color: active ? "#FFF" : "#333" }}>{label}</Text>
    </Pressable>
  );
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: 25,
    paddingTop: 50,
    paddingBottom: 80, // ensures content stops above tab bar
    gap: 18,
    backgroundColor: "#fff",
  },
  phase: {
    gap: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ea9ab2",
    borderRadius: 10,
    backgroundColor: "#fff",
    shadowColor: "#ea9ab2",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  phaseText: { gap: 5 },
  phaseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  phaseTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  phaseTitle: {
    fontFamily: "Onest-Bold",
    fontSize: 24,
    fontWeight: "700",
    color: "#250921",
  },
  phaseIcon: {
    color: "#000",
    fontSize: 20,
    lineHeight: 22,
    fontFamily: "Onest-Bold",
  },
  cycleDay: {
    fontFamily: "Onest",
    fontSize: 16,
    color: "#250921",
  },
  progressBar: {
    height: 10,
    borderRadius: 15,
    backgroundColor: "#efcfe3",
    overflow: "hidden",
  },
  progressFill: {
    width: 200,
    height: "100%",
    backgroundColor: "#C7547F",
    borderRadius: 15,
  },
  phaseNote: {
    backgroundColor: "#eaf2d7",
    borderRadius: 15,
    paddingVertical: 7,
    paddingHorizontal: 9,
  },
  streakBadge: {
    minWidth: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FDECEF",
    borderWidth: 1,
    borderColor: "#F2B7CC",
    alignItems: "center",
    justifyContent: "center",
  },
  streakBadgeTop: {
    color: "#250921",
    fontFamily: "Onest",
    fontSize: 8,
  },
  streakBadgeNum: {
    color: "#000",
    fontFamily: "Onest-Bold",
    fontSize: 14,
    lineHeight: 16,
  },
  streakMetaInline: {
    color: "#555",
    fontFamily: "Onest",
    fontSize: 13,
  },
  streakNotice: {
    color: "#2E7D32",
    fontFamily: "Onest-Bold",
    fontSize: 13,
  },
  noteText: {
    fontFamily: "Onest",
    fontSize: 14,
    lineHeight: 18,
    color: "#250921",
  },
  card: {
    gap: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ea9ab2",
    borderRadius: 10,
    backgroundColor: "#fff",
    shadowColor: "#ea9ab2",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  cardTitle: {
    fontFamily: "Onest-Bold",
    fontSize: 24,
    fontWeight: "700",
    color: "#250921",
  },
  addIcon: { width: 24, height: 16 },
  calendar: {
    borderRadius: 15,
    width: "96%",
    alignSelf: "center",
  },
  legendRow: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#E5B7CC",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  legendText: {
    color: "#777",
    fontSize: 12,
    fontFamily: "Onest",
  },
  input: {
    borderWidth: 1,
    borderColor: "#F48FB1",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#FFF",
    color: "#333",
  },
  symptomList: {
    gap: 8,
    marginTop: 2,
  },
  symptomOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#F48FB1",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#FFF",
  },
  symptomOptionActive: {
    backgroundColor: "#FDECEF",
    borderColor: "#BA5D84",
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#999",
    backgroundColor: "#FFF",
  },
  checkboxActive: {
    backgroundColor: "#BA5D84",
    borderColor: "#BA5D84",
  },
  symptomText: {
    color: "#333",
    fontFamily: "Onest",
    fontSize: 14,
  },
  symptomTextActive: {
    color: "#250921",
    fontFamily: "Onest-Bold",
  },
  scheduleList: {
    gap: 8,
    marginTop: 2,
  },
  scheduleOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#F48FB1",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#FFF",
  },
  scheduleOptionActive: {
    backgroundColor: "#FDECEF",
    borderColor: "#BA5D84",
  },
  medItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 8,
    backgroundColor: "#eaf2d7",
    borderRadius: 15,
  },
  medEmpty: { fontFamily: "Onest", fontSize: 14, color: "#555" },
  medName: { fontFamily: "Onest-Bold", fontSize: 16, color: "#250921" },
  medTime: { fontFamily: "Onest", fontSize: 12, color: "#250921" },
  takenButton: {
    marginTop: 8,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  takenButtonActive: {
    backgroundColor: "#BA5D84",
  },
  takenButtonDone: {
    backgroundColor: "#2E7D32",
  },
  takenButtonText: {
    color: "#FFF",
    fontFamily: "Onest-Bold",
    fontSize: 12,
  },
  removeButton: {
    backgroundColor: "#F48FB1",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  removeButtonText: { color: "#FFF", fontFamily: "Onest-Bold", fontSize: 12 },
});
