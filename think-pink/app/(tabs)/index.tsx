import React from "react";
import { ScrollView, View, Text, Image, StyleSheet } from "react-native";

const Home = () => {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      {/* Phase Section */}
      <View style={styles.phase}>
        <View style={styles.phaseText}>
          <Text style={styles.phaseTitle}>Today: Luteal</Text>
          <Text style={styles.cycleDay}>Cycle Day 20</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={styles.progressFill} />
        </View>
        <View style={styles.phaseNote}>
          <Text style={styles.noteText}>
            Cravings and bloating can show up. Try magnesium + warm meals.
          </Text>
        </View>
      </View>

      {/* Calendar Section */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Calendar</Text>
          <Image
            source={require("../../components/icons/Vector.png")}
            style={styles.addIcon}
            resizeMode="contain"
          />
        </View>
        <View style={styles.cardContent} />
      </View>

      {/* Medications Section */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Medications</Text>
          <Image
            source={require("../../components/icons/Vector.png")}
            style={styles.addIcon}
            resizeMode="contain"
          />
        </View>
        <View style={styles.medItem}>
          <Text style={styles.medName}>Med 1</Text>
          <Text style={styles.medTime}>Every Day, 8:30 PM</Text>
        </View>
        <View style={styles.medItem}>
          <Text style={styles.medName}>Med 2</Text>
          <Text style={styles.medTime}>Every Day, 8:30 PM</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: 25,
    paddingTop: 40,
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
  phaseTitle: {
    fontFamily: "Onest-Bold",
    fontSize: 24,
    fontWeight: "700",
    color: "#250921",
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
    padding: 10,
  },
  noteText: {
    fontFamily: "Onest",
    fontSize: 16,
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
  cardContent: {
    flex: 1,
    height: 200,
    backgroundColor: "#efcfe3",
    borderRadius: 15,
  },
  addIcon: { width: 30, height: 20 },
  medItem: {
    padding: 8,
    backgroundColor: "#eaf2d7",
    borderRadius: 15,
  },
  medName: { fontFamily: "Onest-Bold", fontSize: 16, color: "#250921" },
  medTime: { fontFamily: "Onest", fontSize: 12, color: "#250921" },
});

export default Home;