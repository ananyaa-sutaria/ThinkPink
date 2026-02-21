import { useMemo, useState, useEffect  } from "react";
import { View, Text, Modal, Pressable, TextInput, ScrollView } from "react-native";
import { Calendar } from "react-native-calendars";
import PhaseLegend from "../../components/PhaseLegend";
import SymptomChips from "../../components/SymptomChips";
import { phaseColors, phaseForDate, ymd } from "../../lib/phases";
import { getLog, saveLog, symptomOptions } from "../../lib/mock";
import { fetchDailyInsight } from "../../lib/geminiClient";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function LogScreen() {
  const todayStr = ymd(new Date());
  const [selected, setSelected] = useState<string>(todayStr);
  const [open, setOpen] = useState(false);

  const markedDates = useMemo(() => {
    // Color-code current month by phase (simple demo)
    const base: Record<string, any> = {};
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
      const key = ymd(d);
      const { phase } = phaseForDate(new Date(key + "T00:00:00"));
      const colors = phaseColors[phase];
      base[key] = {
        customStyles: {
          container: {
            backgroundColor: colors.fill,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "transparent",
          },
          text: { color: "#333" },
        },
      };
    }

    // Selected day styling
    base[selected] = {
      ...(base[selected] || {}),
      selected: true,
      customStyles: {
        ...(base[selected]?.customStyles || {}),
        container: {
          ...(base[selected]?.customStyles?.container || {}),
          borderColor: "#D81B60",
          borderWidth: 2,
        },
        text: { color: "#333", fontWeight: "700" },
      },
    };

    // Today outline (if different from selected)
    if (todayStr !== selected) {
      base[todayStr] = {
        ...(base[todayStr] || {}),
        customStyles: {
          ...(base[todayStr]?.customStyles || {}),
          container: {
            ...(base[todayStr]?.customStyles?.container || {}),
            borderColor: "#F48FB1",
            borderWidth: 2,
          },
        },
      };
    }

    return base;
  }, [selected]);

  function DayLogModal({
  date,
  open,
  onClose,
}: {
  date: string;
  open: boolean;
  onClose: () => void;
}) {
  const initial = useMemo(() => getLog(date), [date]);

  const [periodStart, setPeriodStart] = useState(false);
  const [periodEnd, setPeriodEnd] = useState(false);
  const [spotting, setSpotting] = useState(false);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [mood, setMood] = useState<number>(3);
  const [energy, setEnergy] = useState<number>(3);
  const [notes, setNotes] = useState<string>("");

  const [aiInsight, setAiInsight] = useState<{
    insight: string;
    foodTip: string;
    selfCareTip: string;
  } | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  // reset modal state whenever user taps a different day (or reopens)
  useEffect(() => {
    setPeriodStart(!!initial.periodStart);
    setPeriodEnd(!!initial.periodEnd);
    setSpotting(!!initial.spotting);
    setSymptoms(initial.symptoms || []);
    setMood(initial.mood ?? 3);
    setEnergy(initial.energy ?? 3);
    setNotes(initial.notes ?? "");
    setAiInsight(null);
    setLoadingAI(false);
  }, [initial, open]);

  const { phase, cycleDay } = phaseForDate(new Date(date + "T00:00:00"));
  const colors = phaseColors[phase];

  const toggleSymptom = (s: string) => {
    setSymptoms((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const save = async () => {
    // 1) save locally first (fast + always works)
    saveLog({
      date,
      periodStart,
      periodEnd,
      spotting,
      symptoms,
      mood,
      energy,
      notes,
    });

    // 2) generate Gemini insight
    setLoadingAI(true);
    try {
      const data = await fetchDailyInsight({
        date,
        phase,
        symptoms,
        mood,
        energy,
        notes,
        dietaryPrefs: "vegetarian", // later from profile
      });
      setAiInsight(data);
    } catch (err) {
      console.error("AI failed:", err);
      setAiInsight({
        insight: "Couldn’t generate insight right now.",
        foodTip: "Try a warm, balanced meal with protein + complex carbs.",
        selfCareTip: "Hydrate and do light stretching.",
      });
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.25)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 16,
            maxHeight: "85%",
          }}
        >
          <View style={{ alignItems: "center", marginBottom: 10 }}>
            <View
              style={{
                width: 52,
                height: 5,
                borderRadius: 999,
                backgroundColor: "#EEE",
              }}
            />
          </View>

          <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 18 }}>
            <View
              style={{
                padding: 12,
                borderRadius: 16,
                backgroundColor: colors.fill,
                borderWidth: 1,
                borderColor: colors.accent,
              }}
            >
              <Text style={{ color: "#333", fontSize: 16, fontWeight: "700" }}>
                {date} • {phase} • Day {cycleDay}
              </Text>
              <Text style={{ color: "#333", marginTop: 4 }}>
                Tap options below to log your day.
              </Text>
            </View>

            <Row>
              <Toggle
                label="Period started"
                on={periodStart}
                onPress={() => setPeriodStart(!periodStart)}
              />
              <Toggle
                label="Period ended"
                on={periodEnd}
                onPress={() => setPeriodEnd(!periodEnd)}
              />
            </Row>

            <Row>
              <Toggle label="Spotting" on={spotting} onPress={() => setSpotting(!spotting)} />
            </Row>

            <View style={{ gap: 8 }}>
              <Text style={{ color: "#333", fontWeight: "700" }}>Symptoms</Text>
              <SymptomChips options={symptomOptions} selected={symptoms} onToggle={toggleSymptom} />
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ color: "#333", fontWeight: "700" }}>Mood (1–5)</Text>
              <Stepper value={mood} setValue={setMood} />
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ color: "#333", fontWeight: "700" }}>Energy (1–5)</Text>
              <Stepper value={energy} setValue={setEnergy} />
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ color: "#333", fontWeight: "700" }}>Notes</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Anything you noticed today…"
                placeholderTextColor="#999"
                multiline
                style={{
                  minHeight: 90,
                  borderWidth: 1,
                  borderColor: "#F48FB1",
                  borderRadius: 16,
                  padding: 12,
                  color: "#333",
                  backgroundColor: "#FFF",
                }}
              />
            </View>

            {loadingAI && <Text style={{ color: "#333" }}>Generating insight…</Text>}

            {aiInsight && (
              <View
                style={{
                  backgroundColor: "#FDECEF",
                  padding: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#F48FB1",
                  gap: 6,
                }}
              >
                <Text style={{ color: "#333", fontWeight: "700" }}>AI insight</Text>
                <Text style={{ color: "#333" }}>{aiInsight.insight}</Text>
                <Text style={{ color: "#333" }}>🍽 {aiInsight.foodTip}</Text>
                <Text style={{ color: "#333" }}>💗 {aiInsight.selfCareTip}</Text>
              </View>
            )}

            <Row>
              <Pressable
                onPress={onClose}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 999,
                  alignItems: "center",
                  backgroundColor: "#FDECEF",
                }}
              >
                <Text style={{ color: "#333", fontWeight: "700" }}>Done</Text>
              </Pressable>

              <Pressable
                onPress={save}
                disabled={loadingAI}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 999,
                  alignItems: "center",
                  backgroundColor: loadingAI ? "#F48FB1" : "#D81B60",
                }}
              >
                <Text style={{ color: "#FFF", fontWeight: "700" }}>
                  {loadingAI ? "Generating…" : "Save + AI"}
                </Text>
              </Pressable>
            </Row>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

  return (
    <View style={{ flex: 1, backgroundColor: "#FDECEF", padding: 16, gap: 12 }}>
      <View style={{ backgroundColor: "#FFFFFF", borderRadius: 20, padding: 14, gap: 10 }}>
        <Text style={{ color: "#333", fontSize: 18, fontWeight: "700" }}>
          Calendar
        </Text>
        <PhaseLegend />
      </View>

      <View style={{ backgroundColor: "#FFFFFF", borderRadius: 20, padding: 10 }}>
        <Calendar
          onDayPress={(day) => {
            setSelected(day.dateString);
            setOpen(true);
          }}
          markingType="custom"
          markedDates={markedDates}
          theme={{
            backgroundColor: "#FFFFFF",
            calendarBackground: "#FFFFFF",
            textSectionTitleColor: "#333",
            monthTextColor: "#333",
            dayTextColor: "#333",
            textDisabledColor: "#bbb",
            arrowColor: "#D81B60",
            todayTextColor: "#D81B60",
          }}
        />
      </View>

      <Pressable
        onPress={() => setOpen(true)}
        style={{
          backgroundColor: "#D81B60",
          borderRadius: 999,
          paddingVertical: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#FFF", fontWeight: "700" }}>Log selected day</Text>
      </Pressable>

      <DayLogModal
        date={selected}
        open={open}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

function DayLogModal({
  date,
  open,
  onClose,
}: {
  date: string;
  open: boolean;
  onClose: () => void;
}) {
  const initial = useMemo(() => getLog(date), [date]);
  const [periodStart, setPeriodStart] = useState(!!initial.periodStart);
  const [periodEnd, setPeriodEnd] = useState(!!initial.periodEnd);
  const [spotting, setSpotting] = useState(!!initial.spotting);
  const [symptoms, setSymptoms] = useState<string[]>(initial.symptoms);
  const [mood, setMood] = useState<number>(initial.mood);
  const [energy, setEnergy] = useState<number>(initial.energy);
  const [notes, setNotes] = useState<string>(initial.notes);

  const { phase, cycleDay } = phaseForDate(new Date(date + "T00:00:00"));
  const colors = phaseColors[phase];

  const toggleSymptom = (s: string) => {
    setSymptoms((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const save = () => {
    saveLog({
      date,
      periodStart,
      periodEnd,
      spotting,
      symptoms,
      mood,
      energy,
      notes,
    });
    onClose();
  };

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.25)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, maxHeight: "85%" }}>
          <View style={{ alignItems: "center", marginBottom: 10 }}>
            <View style={{ width: 52, height: 5, borderRadius: 999, backgroundColor: "#EEE" }} />
          </View>

          <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 18 }}>
            <View style={{ padding: 12, borderRadius: 16, backgroundColor: colors.fill, borderWidth: 1, borderColor: colors.accent }}>
              <Text style={{ color: "#333", fontSize: 16, fontWeight: "700" }}>
                {date} • {phase} • Day {cycleDay}
              </Text>
              <Text style={{ color: "#333", marginTop: 4 }}>
                Tap options below to log your day.
              </Text>
            </View>

            <Row>
              <Toggle label="Period started" on={periodStart} onPress={() => setPeriodStart(!periodStart)} />
              <Toggle label="Period ended" on={periodEnd} onPress={() => setPeriodEnd(!periodEnd)} />
            </Row>

            <Row>
              <Toggle label="Spotting" on={spotting} onPress={() => setSpotting(!spotting)} />
            </Row>

            <View style={{ gap: 8 }}>
              <Text style={{ color: "#333", fontWeight: "700" }}>Symptoms</Text>
              <SymptomChips options={symptomOptions} selected={symptoms} onToggle={toggleSymptom} />
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ color: "#333", fontWeight: "700" }}>Mood (1–5)</Text>
              <Stepper value={mood} setValue={setMood} />
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ color: "#333", fontWeight: "700" }}>Energy (1–5)</Text>
              <Stepper value={energy} setValue={setEnergy} />
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ color: "#333", fontWeight: "700" }}>Notes</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Anything you noticed today…"
                placeholderTextColor="#999"
                multiline
                style={{
                  minHeight: 90,
                  borderWidth: 1,
                  borderColor: "#F48FB1",
                  borderRadius: 16,
                  padding: 12,
                  color: "#333",
                  backgroundColor: "#FFF",
                }}
              />
            </View>

            <Row>
              <Pressable
                onPress={onClose}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 999, alignItems: "center", backgroundColor: "#FDECEF" }}
              >
                <Text style={{ color: "#333", fontWeight: "700" }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={save}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 999, alignItems: "center", backgroundColor: "#D81B60" }}
              >
                <Text style={{ color: "#FFF", fontWeight: "700" }}>Save</Text>
              </Pressable>
            </Row>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Row({ children }: { children: any }) {
  return <View style={{ flexDirection: "row", gap: 10 }}>{children}</View>;
}

function Toggle({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: on ? "#D81B60" : "#FFFFFF",
        borderWidth: 1,
        borderColor: on ? "#D81B60" : "#F48FB1",
      }}
    >
      <Text style={{ color: on ? "#FFFFFF" : "#333", fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

function Stepper({ value, setValue }: { value: number; setValue: (n: number) => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Pressable
        onPress={() => setValue(clamp(value - 1, 1, 5))}
        style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#FDECEF", alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: "#333", fontSize: 18, fontWeight: "800" }}>−</Text>
      </Pressable>
      <View style={{ flex: 1, height: 44, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#F48FB1", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#333", fontWeight: "800" }}>{value}</Text>
      </View>
      <Pressable
        onPress={() => setValue(clamp(value + 1, 1, 5))}
        style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#FDECEF", alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: "#333", fontSize: 18, fontWeight: "800" }}>+</Text>
      </Pressable>
    </View>
  );
}