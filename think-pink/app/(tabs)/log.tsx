import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { cycleChat } from "../../lib/chatClient";import { buildUserSnapshot } from "../../lib/userSnaphot";


type Msg = { id: string; role: "user" | "assistant"; text: string };


export default function LogChatScreen() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "m0",
      role: "assistant",
      text:
        "Ask me anything about your cycle data.\n\nExamples:\n• When was my last period?\n• How do I usually feel in luteal?\n• What should I eat today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);


  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.length]);


  const canSend = useMemo(() => input.trim().length > 0 && !sending, [input, sending]);


  async function onSend() {
    if (!canSend) return;


    const text = input.trim();
    setInput("");


    const userMsg: Msg = { id: `u_${Date.now()}`, role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);


    try {
      const message = userMsg;
      const snapshot = await buildUserSnapshot();
      const r = await cycleChat({ message: userMsg.text, snapshot });
      const botMsg: Msg = { id: `a_${Date.now()}`, role: "assistant", text:r.answer };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e: any) {
      const botMsg: Msg = {
        id: `a_${Date.now()}`,
        role: "assistant",
        text: "I couldn’t answer that right now. Try again in a moment.",
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setSending(false);
    }
  }


  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#FDECEF" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ padding: 16, gap: 10, flex: 1, paddingBottom: 110 }}>
        <View style={{ backgroundColor: "#FFF", borderRadius: 20, padding: 16, gap: 6 }}>
          <Text style={{ color: "#333", fontSize: 18, fontWeight: "800" }}>Ask ThinkPink</Text>
          <Text style={{ color: "#555" }}>
            <Text style={{ fontWeight: "800", color: "#333" }}>
              We do not offer medical advice.
            </Text>{" "}
            We provide a comprehensive study of your data to help you prepare for conversations with healthcare providers.
          </Text>
        </View>


        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
        >
          {messages.map((m) => (
            <View
              key={m.id}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                backgroundColor: m.role === "user" ? "#D81B60" : "#FFF",
                borderRadius: 18,
                paddingVertical: 10,
                paddingHorizontal: 12,
                maxWidth: "85%",
              }}
            >
              <Text style={{ color: m.role === "user" ? "#FFF" : "#333" }}>{m.text}</Text>
            </View>
          ))}


          {sending ? (
            <View
              style={{
                alignSelf: "flex-start",
                backgroundColor: "#FFF",
                borderRadius: 18,
                paddingVertical: 10,
                paddingHorizontal: 12,
              }}
            >
              <Text style={{ color: "#555" }}>Thinking…</Text>
            </View>
          ) : null}
        </ScrollView>


        <View
          style={{
            flexDirection: "row",
            gap: 10,
            alignItems: "center",
            backgroundColor: "#FFF",
            padding: 10,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#F48FB1",
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask about your cycle…"
            placeholderTextColor="#999"
            style={{ flex: 1, color: "#333" }}
            onSubmitEditing={onSend}
          />
          <Pressable
            onPress={onSend}
            disabled={!canSend}
            style={{
              backgroundColor: canSend ? "#D81B60" : "#F48FB1",
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 999,
            }}
          >
            <Text style={{ color: "#FFF" }}>{sending ? "…" : "Send"}</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
