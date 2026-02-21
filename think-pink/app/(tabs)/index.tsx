import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, Modal, TextInput, ScrollView } from "react-native";
import { Calendar } from "react-native-calendars";
import { getOrCreateUserId } from "../../lib/userId";
import { saveLog, fetchRecentCycleLogs } from "../../lib/logClient";

type CycleLog = {
  userId: string;
  dateISO: string; // YYYY-MM-DD
  phase?: string;
  cycleDay?: number;
  mood?: number; // 1-5
  energy?: number; // 1-5
  symptoms?: string[];
  notes?: string;
  periodStart?: boolean;
  periodEnd?: boolean;
  spotting?: boolean;
};

const BG = "#FDECEF";
const CARD = "#FFF";
const PINK = "#D81B60";
const PINK_SOFT = "#F48FB1";
const TEXT = "#333";
const SUB = "#555";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetweenISO(aISO: string, bISO: string) {
  const a = new Date(aISO + "T00:00:00Z");
  const b = new Date(bISO + "T00:00:00Z");
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function estimatePhaseFromCycleDay(day?: number) {
  if (!day || day <= 0) return undefined;
  if (day <= 5) return "menstrual";
  if (day <= 13) return "follicular";
  if (day <= 16) return "ovulation";
  if (day <= 28) return "luteal";
  return "luteal";
}

function phaseDotColor(phase?: string) {
  switch (phase) {
    case "menstrual":
      return "#C2185B";
    case "follicular":
      return "#7B1FA2";
    case "ovulation":
      return "#2E7D32";
    case "luteal":
      return "#EF6C00";
    default:
      return "#9E9E9E";
  }
}

function cap1(s?: string) {
  if (!s) return "";
  return s.slice(0, 1).toUpperCase() + s.slice(1);
}

export default function HomeScreen() {
  const [userId, setUserId] = useState<string>("");
  const [logs, setLogs] = useState<CycleLog[]>([]);
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState<string>(todayISO());
  const [open, setOpen] = useState(false);

  // form fields for the selected day
  const [periodStart, setPeriodStart] = useState(false);
  const [periodEnd, setPeriodEnd] = useState(false);
  const [spotting, setSpotting] = useState(false);
  const [mood, setMood] = useState<string>("");   // store as string then parse
  const [energy, setEnergy] = useState<string>("");
  const [symptoms, setSymptoms] = useState<string>(""); // comma-separated
  const [notes, setNotes] = useState<string>("");

  // find the most recent period start from existing logs
  const lastPeriodStartISO = useMemo(() => {
    const starts = logs
      .filter((l) => l.periodStart)
      .sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));
    return starts[0]?.dateISO;
  }, [logs]);

  function computeCycleDay(dateISO: string) {
    if (!lastPeriodStartISO) return undefined;
    const diff = daysBetweenISO(lastPeriodStartISO, dateISO);
    if (diff < 0) return undefined;
    return diff + 1;
  }

  const todayCycleDay = useMemo(() => computeCycleDay(todayISO()), [lastPeriodStartISO]);
  const todayPhase = useMemo(() => estimatePhaseFromCycleDay(todayCycleDay), [todayCycleDay]);

  async function refresh() {
    setLoading(true);
    try {
      const uid = userId || (await getOrCreateUserId());
      if (!userId) setUserId(uid);

const rec = await fetchRecentCycleLogs({ userId: uid, limit: 120 });
setLogs(rec.logs);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getOrCreateUserId().then((uid) => setUserId(uid));
  }, []);

  useEffect(() => {
    if (userId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function openForDate(dateISO: string) {
    setSelected(dateISO);

    // hydrate modal with existing log if present
    const existing = logs.find((l) => l.dateISO === dateISO);
    setPeriodStart(!!existing?.periodStart);
    setPeriodEnd(!!existing?.periodEnd);
    setSpotting(!!existing?.spotting);
    setMood(existing?.mood ? String(existing.mood) : "");
    setEnergy(existing?.energy ? String(existing.energy) : "");
    setSymptoms(existing?.symptoms?.join(", ") || "");
    setNotes(existing?.notes || "");

    setOpen(true);
  }

  async function onSaveDay() {
    if (!userId) return;

    const cycleDay = computeCycleDay(selected);
    const phase = estimatePhaseFromCycleDay(cycleDay);

    const payload: CycleLog = {
      userId,
      dateISO: selected,
      periodStart,
      periodEnd,
      spotting,
      cycleDay,
      phase,
      mood: mood ? Math.max(1, Math.min(5, Number(mood))) : undefined,
      energy: energy ? Math.max(1, Math.min(5, Number(energy))) : undefined,
      symptoms: symptoms
        ? symptoms.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      notes: notes || "",
    };

    await saveLog(payload);
    setOpen(false);
    await refresh();
  }

  // Calendar markings:
  // - dot color = phase (computed from last period start)
  // - selected day highlighted
  // - periodStart days get a stronger highlight
  const markedDates = useMemo(() => {
    const m: Record<string, any> = {};

    // mark all dates we know about + also mark the last 35 days for phase dots
    const byDate: Record<string, CycleLog> = {};
    logs.forEach((l) => (byDate[l.dateISO] = l));

    // build a window so the calendar doesn’t look empty
    const base = new Date(todayISO() + "T00:00:00Z");
    for (let i = -35; i <= 0; i++) {
      const d = new Date(base);
      d.setUTCDate(base.getUTCDate() + i);
      const iso = d.toISOString().slice(0, 10);

      const cd = computeCycleDay(iso);
      const ph = estimatePhaseFromCycleDay(cd);

      m[iso] = {
        marked: !!ph,
        dotColor: phaseDotColor(ph),
      };
    }

    // overlay real logs
    for (const l of logs) {
      const ph = l.phase || estimatePhaseFromCycleDay(l.cycleDay);
      m[l.dateISO] = {
        ...(m[l.dateISO] || {}),
        marked: true,
        dotColor: phaseDotColor(ph),
      };

      if (l.periodStart) {
        m[l.dateISO] = {
          ...(m[l.dateISO] || {}),
          selected: true,
          selectedColor: "#C2185B",
        };
      }
    }

    // selected day highlight (wins last)
    m[selected] = {
      ...(m[selected] || {}),
      selected: true,
      selectedColor: PINK,
    };

    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs, selected, lastPeriodStartISO]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: BG }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      {/* Today card */}
      <View style={{ backgroundColor: CARD, padding: 16, borderRadius: 20 }}>
        <Text style={{ color: TEXT, fontSize: 20, fontWeight: "800" }}>Think Pink</Text>

        <View style={{ marginTop: 12, borderRadius: 16, borderWidth: 1, borderColor: PINK_SOFT, padding: 12 }}>
          <Text style={{ color: TEXT, fontWeight: "800", fontSize: 16 }}>
            Today: {todayPhase ? cap1(todayPhase) : "Unknown"}
          </Text>
          <Text style={{ color: SUB, marginTop: 2 }}>
            {todayCycleDay ? `Cycle Day ${todayCycleDay}` : "Log a period start to calculate cycle day"}
          </Text>

          <View style={{ height: 8, borderRadius: 999, backgroundColor: "#F3C1D1", marginTop: 10, overflow: "hidden" }}>
            <View
              style={{
                width: `${todayCycleDay ? Math.min(100, (todayCycleDay / 28) * 100) : 8}%`,
                height: 8,
                backgroundColor: PINK,
              }}
            />
          </View>

          <View style={{ marginTop: 10, backgroundColor: "#E9F5E6", borderRadius: 12, padding: 10 }}>
            <Text style={{ color: TEXT }}>
              {loading
                ? "Updating..."
                : todayPhase === "luteal"
                ? "Cravings and bloating can show up. Try magnesium + warm meals."
                : "Tap a date to log symptoms and get smarter insights over time."}
            </Text>
          </View>
        </View>
      </View>

      {/* Calendar card */}
      <View style={{ backgroundColor: CARD, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: PINK_SOFT }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <Text style={{ color: TEXT, fontSize: 18, fontWeight: "800" }}>Calendar</Text>
          <Pressable
            onPress={() => openForDate(todayISO())}
            style={{ backgroundColor: BG, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: PINK_SOFT }}
          >
            <Text style={{ color: PINK, fontWeight: "700" }}>Log today</Text>
          </Pressable>
        </View>

        {/* IMPORTANT: Calendar must have real space */}
        <View style={{ borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#F0C3D2" }}>
          <Calendar
            current={selected}
            markedDates={markedDates}
            onDayPress={(day) => openForDate(day.dateString)}
            theme={{
              backgroundColor: CARD,
              calendarBackground: CARD,
              textSectionTitleColor: SUB,
              dayTextColor: TEXT,
              monthTextColor: TEXT,
              arrowColor: PINK,
              todayTextColor: PINK,
              selectedDayTextColor: "#fff",
              dotColor: PINK,
              selectedDotColor: "#fff",
            }}
          />
        </View>

        <Text style={{ color: SUB, marginTop: 10 }}>
          Dots show estimated phase. Tap any day to log and update your history.
        </Text>
      </View>

      {/* Medications card placeholder */}
      <View style={{ backgroundColor: CARD, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: PINK_SOFT }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: TEXT, fontSize: 18, fontWeight: "800" }}>Medications</Text>
          <Text style={{ color: PINK, fontWeight: "800" }}>+</Text>
        </View>

        <View style={{ marginTop: 12, backgroundColor: "#E9F5E6", borderRadius: 12, padding: 10 }}>
          <Text style={{ color: TEXT }}>Add meds reminders next (local notifications).</Text>
        </View>
      </View>

      {/* Log modal */}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: CARD, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, gap: 10 }}>
            <Text style={{ color: TEXT, fontWeight: "900", fontSize: 18 }}>Log for {selected}</Text>

            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <Toggle label="Period start" value={periodStart} onChange={setPeriodStart} />
              <Toggle label="Period end" value={periodEnd} onChange={setPeriodEnd} />
              <Toggle label="Spotting" value={spotting} onChange={setSpotting} />
            </View>

            <Field label="Mood (1-5)" value={mood} onChange={setMood} keyboardType="numeric" />
            <Field label="Energy (1-5)" value={energy} onChange={setEnergy} keyboardType="numeric" />
            <Field label="Symptoms (comma separated)" value={symptoms} onChange={setSymptoms} />
            <Field label="Notes" value={notes} onChange={setNotes} multiline />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => setOpen(false)}
                style={{ flex: 1, backgroundColor: BG, borderRadius: 999, paddingVertical: 12, alignItems: "center" }}
              >
                <Text style={{ color: TEXT, fontWeight: "800" }}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={onSaveDay}
                style={{ flex: 1, backgroundColor: PINK, borderRadius: 999, paddingVertical: 12, alignItems: "center" }}
              >
                <Text style={{ color: "#fff", fontWeight: "800" }}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Toggle(props: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      onPress={() => props.onChange(!props.value)}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: props.value ? "#C2185B" : "#F0C3D2",
        backgroundColor: props.value ? "#F8BBD0" : "#fff",
      }}
    >
      <Text style={{ color: "#333", fontWeight: "700" }}>{props.label}</Text>
    </Pressable>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: "default" | "numeric";
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: "#555", fontWeight: "700" }}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChange}
        keyboardType={props.keyboardType || "default"}
        multiline={props.multiline}
        style={{
          borderWidth: 1,
          borderColor: "#F0C3D2",
          borderRadius: 14,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: "#fff",
          minHeight: props.multiline ? 80 : undefined,
          textAlignVertical: props.multiline ? "top" : "center",
        }}
      />
    </View>
  );
}