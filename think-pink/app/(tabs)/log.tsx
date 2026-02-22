import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { cycleChat } from "../../lib/chatClient";
import { buildUserSnapshot } from "../../lib/userSnaphot";


type Msg = { id: string; role: "user" | "assistant"; text: string };

const PHASE_WORDS = new Set(["luteal", "menstrual", "follicular", "ovulation"]);

function renderHighlightedInline(text: string, baseStyle: any) {
  const source = String(text || "");
  const boldSplit = source.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

  return (
    <Text style={baseStyle}>
      {boldSplit.map((segment, i) => {
        const isMarkedBold = /^\*\*[^*]+\*\*$/.test(segment);
        const clean = isMarkedBold ? segment.slice(2, -2) : segment;
        const words = clean.split(/(\s+)/);
        return words.map((word, j) => {
          const normalized = word.replace(/[^a-z]/gi, "").toLowerCase();
          const isPhaseWord = PHASE_WORDS.has(normalized);
          const key = `seg_${i}_w_${j}`;
          if (isMarkedBold) {
            return (
              <Text key={key} style={styles.emphasisWord}>
                {word}
              </Text>
            );
          }
          if (isPhaseWord) {
            return (
              <Text key={key} style={styles.phaseWord}>
                {word}
              </Text>
            );
          }
          return <Text key={key}>{word}</Text>;
        });
      })}
    </Text>
  );
}

function renderAssistantRichText(text: string) {
  return renderHighlightedInline(String(text || "").trim(), styles.assistantText);
}


export default function LogChatScreen() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "m0",
      role: "assistant",
      text: "Hi! What Can I help you with today?",
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
      const reason = e?.message ? ` (${String(e.message).slice(0, 120)})` : "";
      const botMsg: Msg = {
        id: `a_${Date.now()}`,
        role: "assistant",
        text: `I couldn’t answer that right now. Try again in a moment${reason}.`,
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setSending(false);
    }
  }


  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#FFF" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <ScrollView
          ref={scrollRef}
          style={styles.chatList}
          contentContainerStyle={styles.chatListContent}
        >
          <View style={styles.helperCard}>
            <Text style={styles.helperText}>
              Ask the chat about anything you may have questions about such as your history, how you were feeling, etc.
            </Text>
            <Text style={styles.helperDisclaimer}>
              <Text style={styles.helperDisclaimerBold}>We do not offer medical advice.</Text> We provide data insights
              to support conversations with healthcare providers.
            </Text>
          </View>

          {messages.map((m) => (
            <View
              key={m.id}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                backgroundColor: m.role === "user" ? "#FFFFFF" : "#E8EDD8",
                borderRadius: 14,
                borderWidth: 1,
                borderColor: m.role === "user" ? "#BFD4DA" : "#D8DFC4",
                paddingVertical: 10,
                paddingHorizontal: 12,
                maxWidth: m.role === "assistant" ? "92%" : "85%",
              }}
            >
              {m.role === "assistant" ? (
                renderAssistantRichText(m.text)
              ) : (
                <Text style={{ color: "#333", fontSize: 16, lineHeight: 22 }}>{m.text}</Text>
              )}
            </View>
          ))}

          {sending ? (
            <View
              style={{
                alignSelf: "flex-start",
                backgroundColor: "#E8EDD8",
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#D8DFC4",
                paddingVertical: 10,
                paddingHorizontal: 12,
              }}
            >
              <Text style={{ color: "#555" }}>Thinking…</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.inputWrap}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type Here..."
            placeholderTextColor="#D8B8C8"
            style={styles.input}
            onSubmitEditing={onSend}
            returnKeyType="send"
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 110,
    gap: 12,
  },
  helperCard: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EA9AB2",
    padding: 12,
    gap: 8,
    shadowColor: "#EA9AB2",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  helperText: {
    color: "#2D2230",
    fontFamily: "Onest",
    fontSize: 14,
    lineHeight: 20,
  },
  helperDisclaimer: {
    color: "#555",
    fontFamily: "Onest",
    fontSize: 12,
    lineHeight: 17,
  },
  helperDisclaimerBold: {
    color: "#333",
    fontFamily: "Onest-Bold",
  },
  assistantText: {
    color: "#333",
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "Onest",
  },
  emphasisWord: {
    color: "#C7547F",
    fontFamily: "Onest-Bold",
  },
  phaseWord: {
    color: "#C7547F",
    fontFamily: "Onest-Bold",
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    gap: 10,
    paddingBottom: 12,
  },
  inputWrap: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EA9AB2",
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  input: {
    color: "#333",
    fontFamily: "Onest",
    fontSize: 14,
    paddingVertical: 10,
  },
});
