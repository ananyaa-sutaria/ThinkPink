import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Linking } from "react-native";
import { fetchQuiz, QuizChoice, QuizPayload } from "../../lib/quizClient";
import { useProgress } from "../../lib/progressContext";
import { getItem, setItem } from "../../lib/storage";
import { useAuth } from "../../lib/AuthContext";
import { getOrCreateUserId } from "../../lib/userId";

const PASS_SCORE = 4; // out of 5
const ARTICLE_REWARD = 15;
const DAILY_CHALLENGE_REWARD = 25;

const QUIZ_LEVELS = [
  {
    id: 1,
    title: "Level 1: Basics",
    difficulty: "beginner",
    topic: "Cycle Phases + Symptoms + Nutrition Basics",
    reward: 100,
  },
  {
    id: 2,
    title: "Level 2: Hormones",
    difficulty: "beginner",
    topic: "Hormones + PMS patterns + symptom tracking",
    reward: 150,
  },
  {
    id: 3,
    title: "Level 3: Advanced",
    difficulty: "beginner",
    topic: "Cycle irregularities + evidence-based self-care",
    reward: 200,
  },
] as const;

const LEARN_ARTICLES = [
  {
    id: "cycle-phases",
    title: "Understanding Cycle Phases",
    summary: "Overview of menstrual, follicular, ovulation, and luteal phases.",
    url: "https://www.womenshealth.gov/menstrual-cycle/your-menstrual-cycle",
  },
  {
    id: "pms-symptoms",
    title: "PMS Symptoms Guide",
    summary: "Common symptoms and when to check in with a clinician.",
    url: "https://medlineplus.gov/pms.html",
  },
  {
    id: "period-pain",
    title: "Managing Period Pain",
    summary: "Practical options for cramps and pain support.",
    url: "https://www.acog.org/womens-health/faqs/dysmenorrhea-painful-periods",
  },
] as const;

const DAILY_CHALLENGE_POOL = [
  {
    id: "donate-iod",
    title: "Donate to I Support The Girls",
    summary: "Support period equity by donating products or funds.",
    url: "https://isupportthegirls.org/",
  },
  {
    id: "donate-alliance",
    title: "Support Alliance for Period Supplies",
    summary: "Find ways to donate and help expand access to supplies.",
    url: "https://allianceforperiodsupplies.org/",
  },
  {
    id: "read-womens-health",
    title: "Read: Menstrual Cycle Basics",
    summary: "Review phase basics and symptom patterns.",
    url: "https://www.womenshealth.gov/menstrual-cycle/your-menstrual-cycle",
  },
  {
    id: "read-pms",
    title: "Read: PMS Symptoms",
    summary: "Understand common PMS signs and guidance.",
    url: "https://medlineplus.gov/pms.html",
  },
] as const;

function isoToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function dayIndex(iso: string) {
  const [y, m, d] = iso.split("-").map((n) => Number(n));
  return y * 372 + m * 31 + d;
}

export default function LearnScreen() {
  const { user } = useAuth();
  const [deviceUserId, setDeviceUserId] = useState("");
  const userId = (user as any)?.userId || (user as any)?.id || deviceUserId;
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<QuizPayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, QuizChoice | null>>({});
  const [submitted, setSubmitted] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [activeLevel, setActiveLevel] = useState<number>(1);
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);
  const [readArticles, setReadArticles] = useState<string[]>([]);
  const [completedDailyChallenges, setCompletedDailyChallenges] = useState<string[]>([]);
  const [learnErr, setLearnErr] = useState("");
  const { setCycleBadgeUnlockedLive, addPoints } = useProgress();
  const todayISO = isoToday();
  const dailyStorageKey = userId ? `learn:daily:${userId}:${todayISO}` : "";

  const dailyChallenges = useMemo(() => {
    const i = dayIndex(todayISO) % DAILY_CHALLENGE_POOL.length;
    const j = (i + 1) % DAILY_CHALLENGE_POOL.length;
    return [DAILY_CHALLENGE_POOL[i], DAILY_CHALLENGE_POOL[j]];
  }, [todayISO]);

  useEffect(() => {
    (async () => {
      const uid = await getOrCreateUserId();
      setDeviceUserId(uid);
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      const [levelsRaw, articlesRaw] = await Promise.all([
        getItem(`learn:levels:${userId}`),
        getItem(`learn:articles:${userId}`),
      ]);
      if (cancelled) return;

      try {
        const parsed = levelsRaw ? JSON.parse(levelsRaw) : [];
        setCompletedLevels(Array.isArray(parsed) ? parsed.filter((n) => Number.isFinite(n)) : []);
      } catch {
        setCompletedLevels([]);
      }

      try {
        const parsed = articlesRaw ? JSON.parse(articlesRaw) : [];
        setReadArticles(Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : []);
      } catch {
        setReadArticles([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!dailyStorageKey) return;
    let cancelled = false;

    (async () => {
      const raw = await getItem(dailyStorageKey);
      if (cancelled) return;
      try {
        const parsed = raw ? JSON.parse(raw) : [];
        setCompletedDailyChallenges(
          Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : []
        );
      } catch {
        setCompletedDailyChallenges([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dailyStorageKey]);

  const score = useMemo(() => {
    if (!quiz || !submitted) return null;
    let s = 0;
    for (const q of quiz.questions) {
      if (answers[q.id] && answers[q.id] === q.answer) s += 1;
    }
    return s;
  }, [quiz, submitted, answers]);

  const nextLevel = useMemo(() => {
    const firstIncomplete = QUIZ_LEVELS.find((lvl) => !completedLevels.includes(lvl.id));
    return firstIncomplete?.id || QUIZ_LEVELS[QUIZ_LEVELS.length - 1].id;
  }, [completedLevels]);

  async function startQuiz(levelId: number) {
    const levelMeta = QUIZ_LEVELS.find((lvl) => lvl.id === levelId);
    if (!levelMeta) return;

    setLearnErr("");
    setLoading(true);
    setSubmitted(false);
    setUnlocked(false);
    setActiveLevel(levelId);

    try {
      const q = await fetchQuiz({
        topic: levelMeta.topic,
        level: levelMeta.difficulty,
        numQuestions: 5,
      });
      setQuiz(q);
      const init: Record<string, QuizChoice | null> = {};
      q.questions.forEach((qq) => (init[qq.id] = null));
      setAnswers(init);
    } catch (e: any) {
      setLearnErr(e?.message || "Could not load quiz right now. Please try again.");
      setQuiz(null);
    } finally {
      setLoading(false);
    }
  }

  function choose(questionId: string, choice: QuizChoice) {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: choice }));
  }

  async function submit() {
    if (!quiz) return;
    const levelMeta = QUIZ_LEVELS.find((lvl) => lvl.id === activeLevel);
    if (!levelMeta) return;
    const anyBlank = quiz.questions.some((q) => !answers[q.id]);
    if (anyBlank) return;

    // compute score
    let s = 0;
    for (const q of quiz.questions) {
      if (answers[q.id] === q.answer) s += 1;
    }
    setSubmitted(true);

    if (s >= PASS_SCORE) {
      setUnlocked(true);
      if (levelMeta.id === 1) {
        await setCycleBadgeUnlockedLive(true);
      }

      if (!completedLevels.includes(levelMeta.id)) {
        const nextCompleted = [...completedLevels, levelMeta.id].sort((a, b) => a - b);
        setCompletedLevels(nextCompleted);
        if (userId) await setItem(`learn:levels:${userId}`, JSON.stringify(nextCompleted));
        await addPoints(levelMeta.reward);
      }
    }
  }

  function reset() {
    setQuiz(null);
    setSubmitted(false);
    setUnlocked(false);
    setAnswers({});
  }

  async function openArticle(articleId: string, url: string) {
    setLearnErr("");
    try {
      await Linking.openURL(url);
    } catch {
      setLearnErr("Could not open article link.");
      return;
    }
    if (readArticles.includes(articleId)) return;

    const nextRead = [...readArticles, articleId];
    setReadArticles(nextRead);
    if (userId) await setItem(`learn:articles:${userId}`, JSON.stringify(nextRead));
    await addPoints(ARTICLE_REWARD);
  }

  async function completeDailyChallenge(challengeId: string, url: string) {
    setLearnErr("");
    try {
      await Linking.openURL(url);
    } catch {
      setLearnErr("Could not open challenge link.");
      return;
    }

    if (completedDailyChallenges.includes(challengeId)) return;
    const next = [...completedDailyChallenges, challengeId];
    setCompletedDailyChallenges(next);
    if (dailyStorageKey) await setItem(dailyStorageKey, JSON.stringify(next));
    await addPoints(DAILY_CHALLENGE_REWARD);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {!quiz ? (
        <View style={styles.panelBody}>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Daily Challenge</Text>
              <Text style={styles.infoText}>
                Main focus: complete today’s challenges to earn quick points.
              </Text>

              <View style={{ gap: 8, marginTop: 6 }}>
                {dailyChallenges.map((challenge) => {
                  const done = completedDailyChallenges.includes(challenge.id);
                  return (
                    <Pressable
                      key={challenge.id}
                      onPress={() => completeDailyChallenge(challenge.id, challenge.url)}
                      style={[styles.articleRow, done && styles.articleRowDone]}
                    >
                      <View style={styles.levelRowTop}>
                        <Text style={styles.levelTitle}>{challenge.title}</Text>
                        <Text style={styles.levelPoints}>+{DAILY_CHALLENGE_REWARD} points</Text>
                      </View>
                      <Text style={styles.levelMeta}>{challenge.summary}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Quiz Levels</Text>
              <Text style={styles.infoText}>
                You’re at Level {nextLevel}. Pass each 5-question quiz to earn points. First pass awards points once
                per level.
              </Text>

              <View style={{ gap: 8, marginTop: 6 }}>
                {QUIZ_LEVELS.map((lvl) => {
                  const done = completedLevels.includes(lvl.id);
                  return (
                    <Pressable
                      key={lvl.id}
                      onPress={() => startQuiz(lvl.id)}
                      disabled={loading}
                      style={[styles.levelRow, done && styles.levelRowDone, loading && { opacity: 0.7 }]}
                    >
                      <View style={styles.levelRowTop}>
                        <Text style={styles.levelTitle}>
                          {lvl.title} {done ? "✓" : ""} {loading && activeLevel === lvl.id ? " (Loading…)" : ""}
                        </Text>
                        <Text style={styles.levelPoints}>+{lvl.reward} points</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Articles</Text>
              <Text style={styles.infoText}>Read and open each article to earn +{ARTICLE_REWARD} points.</Text>

              <View style={{ gap: 8, marginTop: 6 }}>
                {LEARN_ARTICLES.map((article) => {
                  const wasRead = readArticles.includes(article.id);
                  return (
                    <Pressable
                      key={article.id}
                      onPress={() => openArticle(article.id, article.url)}
                      style={[styles.articleRow, wasRead && styles.articleRowDone]}
                    >
                      <Text style={styles.levelTitle}>{article.title}</Text>
                      <Text style={styles.levelMeta}>{article.summary}</Text>
                      <Text style={styles.articleReward}>{wasRead ? "Read ✓" : `Read (+${ARTICLE_REWARD})`}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {learnErr ? (
              <View style={styles.badgeCallout}>
                <Text style={{ color: "#C62828", fontFamily: "Onest" }}>{learnErr}</Text>
              </View>
            ) : null}

            {unlocked ? (
              <View style={styles.badgeCallout}>
                <Text style={styles.badgeCalloutTitle}>Badge unlocked</Text>
                <Text style={styles.badgeCalloutText}>Go to Badges to mint Cycle Literacy Level 1.</Text>
              </View>
            ) : null}
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <View style={{ backgroundColor: "#FFF", borderRadius: 16, padding: 16, gap: 8, borderWidth: 1, borderColor: "#F2B7CC" }}>
            <Text style={{ color: "#333", fontWeight: "800" }}>{quiz.topic}</Text>
            <Text style={{ color: "#555" }}>Choose the best answer for each question.</Text>
            {learnErr ? <Text style={{ color: "#C62828" }}>{learnErr}</Text> : null}

            {quiz.questions.map((q, idx) => (
              <View key={q.id} style={{ marginTop: 10, gap: 8 }}>
              <Text style={{ color: "#333", fontWeight: "800" }}>
                {idx + 1}. {q.question}
              </Text>

                {(["A", "B", "C", "D"] as QuizChoice[]).map((ch) => {
                  const selected = answers[q.id] === ch;
                  const correct = submitted && q.answer === ch;
                  const wrongSelected = submitted && selected && q.answer !== ch;

                  return (
                    <Pressable
                      key={ch}
                      onPress={() => choose(q.id, ch)}
                      style={[
                        styles.choiceBtn,
                        selected && { backgroundColor: "#FDECEF" },
                        correct && { borderColor: "#2E7D32" },
                        wrongSelected && { borderColor: "#C62828" },
                      ]}
                    >
                      <Text style={styles.choiceText}>
                        {ch}. {q.choices[ch]}
                      </Text>
                    </Pressable>
                  );
                })}

                {submitted && <Text style={styles.cardText}>Explanation: {q.explanation}</Text>}
              </View>
            ))}

            {!submitted ? (
              <Pressable onPress={submit} style={styles.primaryBtn}>
                <Text style={styles.primaryText}>Submit</Text>
              </Pressable>
            ) : (
              <View style={{ marginTop: 14, gap: 10 }}>
                <View
                  style={{
                    backgroundColor: "#FDECEF",
                    borderRadius: 16,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: "#F48FB1",
                  }}
                >
                  <Text style={{ color: "#333", fontWeight: "800" }}>
                    Level {activeLevel} score: {score}/5
                  </Text>
                  <Text style={{ color: "#333" }}>
                    {score !== null && score >= PASS_SCORE
                      ? "You passed this level."
                      : "You didn’t pass yet. Try again!"}
                  </Text>
                </View>

                <Pressable onPress={reset} style={[styles.primaryBtn, { backgroundColor: "#FDECEF" }]}>
                  <Text style={[styles.primaryText, { color: "#333" }]}>Back</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    padding: 16,
    paddingBottom: 60,
  },
  panel: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F2B7CC",
  },
  panelBody: {
    gap: 16,
    padding: 16,
  },
  infoCard: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F2B7CC",
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  infoTitle: {
    color: "#2D2230",
    fontFamily: "Onest-Bold",
    fontSize: 22,
  },
  infoText: {
    color: "#2D2230",
    fontFamily: "Onest",
    fontSize: 16,
    lineHeight: 22,
  },
  levelRow: {
    borderWidth: 1,
    borderColor: "#F2B7CC",
    borderRadius: 12,
    padding: 10,
    gap: 4,
    backgroundColor: "#FFF",
  },
  levelRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  levelRowDone: {
    backgroundColor: "#E8F5E9",
    borderColor: "#A5D6A7",
  },
  levelTitle: {
    color: "#2D2230",
    fontFamily: "Onest-Bold",
    fontSize: 16,
  },
  levelMeta: {
    color: "#555",
    fontFamily: "Onest",
    fontSize: 13,
  },
  levelPoints: {
    color: "#BA5D84",
    fontFamily: "Onest-Bold",
    fontSize: 13,
  },
  articleRow: {
    borderWidth: 1,
    borderColor: "#F2B7CC",
    borderRadius: 12,
    padding: 10,
    gap: 5,
    backgroundColor: "#FFF",
  },
  articleRowDone: {
    backgroundColor: "#FDECEF",
  },
  articleReward: {
    color: "#BA5D84",
    fontFamily: "Onest-Bold",
    fontSize: 13,
  },

  // ⚡ ADD THESE STYLES
  choiceBtn: {
    borderWidth: 1,
    borderColor: "#F2B7CC",
    borderRadius: 12,
    padding: 10,
    marginVertical: 4,
    backgroundColor: "#FFF",
  },
  choiceText: {
    fontFamily: "Onest",
    color: "#2D2230",
    fontSize: 14,
  },
  cardText: {
    fontFamily: "Onest",
    color: "#333",
    fontSize: 14,
    marginTop: 6,
  },
  primaryBtn: {
    backgroundColor: "#BA5D84",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  primaryText: {
    fontFamily: "Onest-Bold",
    color: "#FFF",
    fontSize: 16,
  },
  badgeCallout: {
  backgroundColor: "#FFF3E0",
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#FFB74D",
  padding: 12,
  marginTop: 12,
  gap: 6,
},
badgeCalloutTitle: {
  fontFamily: "Onest-Bold",
  fontSize: 16,
  color: "#E65100",
},
badgeCalloutText: {
  fontFamily: "Onest",
  fontSize: 14,
  color: "#E65100",
},
});
