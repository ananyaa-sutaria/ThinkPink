import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Calendar } from "react-native-calendars";

import PhaseLegend from "../../components/PhaseLegend";
import SymptomChips from "../../components/SymptomChips";

import { phaseColors, phaseForDate, ymd } from "../../lib/phases";
import { getLog, saveLog, symptomOptions } from "../../lib/mock";
import { fetchDailyInsight } from "../../lib/geminiClient";
import { askCycleChat } from "../../lib/chatClient";
import { buildUserSnapshot } from "../../lib/userSnaphot";

type Msg = { id: string; role: "user" | "assistant"; text: string };

export default function LogScreen() {
  const todayStr = ymd(new Date());
  const [selected, setSelected] = useState(todayStr);
  const [open, setOpen] = useState(false);

  const markedDates = useMemo(() => {
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
          },
          text: { color: "#333" },
        },
      };
    }

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

    return base;
  }, [selected]);

  return (
    <View style={{ flex: 1, backgroundColor: "#FDECEF", padding: 16, gap: 12 }}>
      <View style={{ backgroundColor: "#FFF", borderRadius: 20, padding: 14 }}>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>Calendar</Text>
        <PhaseLegend />
      </View>

      <View style={{ backgroundColor: "#FFF", borderRadius: 20, padding: 10 }}>
        <Calendar
          markingType="custom"
          markedDates={markedDates}
          onDayPress={(d) => {
            setSelected(d.dateString);
            setOpen(true);
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

      <DayLogModal date={selected} open={open} onClose={() => setOpen(false)} />
    </View>
  );
}

/* ===================== MODAL ===================== */

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
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [notes, setNotes] = useState("");

  const [aiInsight, setAiInsight] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  /* ---------- CHAT STATE ---------- */

  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "m0",
      role: "assistant",
      text: "Ask me anything about your cycle data.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setPeriodStart(!!initial.periodStart);
    setPeriodEnd(!!initial.periodEnd);
    setSpotting(!!initial.spotting);
    setSymptoms(initial.symptoms || []);
    setMood(initial.mood ?? 3);
    setEnergy(initial.energy ?? 3);
    setNotes(initial.notes ?? "");
    setAiInsight(null);
  }, [initial, open]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages]);

  const { phase, cycleDay } = phaseForDate(new Date(date + "T00:00:00"));
  const colors = phaseColors[phase];

  const toggleSymptom = (s: string) =>
    setSymptoms((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  const save = async () => {
    saveLog({ date, periodStart, periodEnd, spotting, symptoms, mood, energy, notes });

    setLoadingAI(true);
    try {
      const data = await fetchDailyInsight({
        date,
        phase,
        symptoms,
        mood,
        energy,
        notes,
        dietaryPrefs: "vegetarian",
      });
      setAiInsight(data);
    } finally {
      setLoadingAI(false);
    }
  };

  const onSend = async () => {
    if (!input.trim() || sending) return;

    const text = input.trim();
    setInput("");

    setMessages((p) => [...p, { id: Date.now() + "_u", role: "user", text }]);
    setSending(true);

    try {
      const snapshot = await buildUserSnapshot();
      const res = await askCycleChat({ message: text, snapshot });

      setMessages((p) => [
        ...p,
        { id: Date.now() + "_a", role: "assistant", text: res.answer },
      ]);
    } catch {
      setMessages((p) => [
        ...p,
        {
          id: Date.now() + "_a",
          role: "assistant",
          text: "I couldn’t answer that right now.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.25)", justifyContent: "flex-end" }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, maxHeight: "90%" }}>
          <ScrollView ref={scrollRef} contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>

            <View style={{ padding: 12, borderRadius: 16, backgroundColor: colors.fill }}>
              <Text style={{ fontWeight: "700" }}>
                {date} • {phase} • Day {cycleDay}
              </Text>
            </View>

            <Text style={{ fontWeight: "700" }}>Symptoms</Text>
            <SymptomChips options={symptomOptions} selected={symptoms} onToggle={toggleSymptom} />

            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes"
              style={{ borderWidth: 1, borderColor: "#F48FB1", borderRadius: 12, padding: 10 }}
            />

            <Pressable onPress={save} style={{ backgroundColor: "#D81B60", padding: 12, borderRadius: 999 }}>
              <Text style={{ color: "#FFF", textAlign: "center", fontWeight: "700" }}>
                {loadingAI ? "Generating…" : "Save + AI"}
              </Text>
            </Pressable>

            {aiInsight && (
              <View style={{ backgroundColor: "#FDECEF", padding: 12, borderRadius: 16 }}>
                <Text>{aiInsight.insight}</Text>
                <Text>🍽 {aiInsight.foodTip}</Text>
                <Text>💗 {aiInsight.selfCareTip}</Text>
              </View>
            )}

            <Text style={{ fontWeight: "800", marginTop: 10 }}>Ask ThinkPink</Text>

            {messages.map((m) => (
              <View key={m.id} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start" }}>
                <Text>{m.text}</Text>
              </View>
            ))}

            {sending && <Text>Thinking…</Text>}

            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Ask about your cycle…"
                style={{ flex: 1, borderWidth: 1, borderColor: "#F48FB1", borderRadius: 12, padding: 8 }}
              />
              <Pressable onPress={onSend} style={{ backgroundColor: "#D81B60", padding: 10, borderRadius: 999 }}>
                <Text style={{ color: "#FFF" }}>Send</Text>
              </Pressable>
            </View>

            <Pressable onPress={onClose}>
              <Text style={{ textAlign: "center", marginTop: 10 }}>Done</Text>
            </Pressable>

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}