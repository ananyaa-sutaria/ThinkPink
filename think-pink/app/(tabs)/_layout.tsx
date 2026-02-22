import React, { useEffect, useState } from "react";
import { Tabs, useSegments } from "expo-router";
import { View, Text, Dimensions, StyleSheet, Image } from "react-native";
import * as Font from "expo-font";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";

import BottomNav from "../../components/BottomNav";
import AccountButton from "../../components/AccountButton";

import HeaderWave from "../../components/HeaderWave";
import HeaderWaveLearn from "../../components/HeaderWaveLearn";
import HeaderWaveImpact from "../../components/HeaderWaveImpact";
import HeaderWaveFlow from "../../components/HeaderWaveFlow";
import HeaderWaveBadge from "../../components/HeaderWaveBadge";

const { width: screenWidth } = Dimensions.get("window");

/* ---------------- HEADER MAPPING ---------------- */
const headerMap: Record<string, React.FC<any>> = {
  learn: HeaderWaveLearn,
  impact: HeaderWaveImpact,
  index: HeaderWave,
  log: HeaderWaveFlow,
  badges: HeaderWaveBadge,
};

/* ---------------- FONT LOADER ------------------- */
const useLocalFonts = () => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Font.loadAsync({
      "LeckerliOne-Regular": require("../../assets/fonts/Leckerli_One/LeckerliOne-Regular.ttf"),
      Onest: require("../../assets/fonts/Onest/static/Onest-Regular.ttf"),
      "Onest-Bold": require("../../assets/fonts/Onest/static/Onest-Bold.ttf"),
    }).then(() => setLoaded(true));
  }, []);

  return loaded;
};

/* ------------- ANIMATED HEADER WAVE ------------ */
function AnimatedHeader({ routeName }: { routeName: string }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = 2; // start bigger for animation
    scale.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.exp),
    });
  }, [routeName]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const HeaderComponent = headerMap[routeName] ?? HeaderWave;

  return (
    <Animated.View style={[styles.waveContainer, animatedStyle]}>
      <HeaderComponent scale={(screenWidth / 380) * 1.2} fill="#A40E4C" />
    </Animated.View>
  );
}

/* ------------------ LAYOUT ---------------------- */
export default function TabsLayout() {
  const fontsLoaded = useLocalFonts();

  // Detect current route safely
  const segments = useSegments();
  const lastSegment = segments[segments.length - 1] ?? "index";

  // Normalize routeName safely
  const routeName: string =
    lastSegment === "(tabs)" || lastSegment == null ? "index" : String(lastSegment);

  const isHome = routeName === "index";

  // Map route names to display titles
  const titleMap: Record<string, string> = {
    index: "Think Pink",
    learn: "Learn",
    impact: "Donate",
    log: "My Flow",
    badges: "Badges",
  };

  if (!fontsLoaded) return null;

  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          sceneStyle: { backgroundColor: "#FFF" },

          /* ---------- HEADER ---------- */
          headerTitle: () => (
            <View style={isHome ? styles.headerHome : styles.headerCentered}>
              <Text style={styles.logo}>{titleMap[routeName]}</Text>
              {isHome && <AccountButton />}
            </View>
          ),

          headerBackground: () => <AnimatedHeader routeName={routeName} />,
          headerTitleAlign: isHome ? "left" : "center",
          headerStyle: { backgroundColor: "#FFF" },
          headerTintColor: "#fff",

          /* ---------- TAB BAR ---------- */
          tabBarBackground: () => <BottomNav scale={1.17} fill="#7b2f4f" />,
          tabBarStyle: {
            backgroundColor: "transparent",
            borderTopWidth: 0,
            elevation: 0,
            height: 60,
            position: "absolute",
          },
          tabBarActiveTintColor: "#A40E4C",
          tabBarInactiveTintColor: "#C7547F",
        }}
      >
        <Tabs.Screen
          name="learn"
          options={{
            title: "Learn",
            tabBarIcon: ({ focused }) => (
              <Image
                source={require("../../components/icons/book-ribbon-rounded.png")}
                style={[styles.icon, { tintColor: focused ? "#A40E4C" : "#C7547F" }]}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="impact"
          options={{
            title: "Impact",
            tabBarIcon: ({ focused }) => (
              <Image
                source={require("../../components/icons/heart-smile-rounded.png")}
                style={[styles.icon, { tintColor: focused ? "#A40E4C" : "#C7547F" }]}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ focused }) => (
              <Image
                source={require("../../components/icons/family-home-outline-rounded.png")}
                style={[styles.icon, { tintColor: focused ? "#A40E4C" : "#C7547F" }]}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="log"
          options={{
            title: "Log",
            tabBarIcon: ({ focused }) => (
              <Image
                source={require("../../components/icons/bedtime-rounded.png")}
                style={[styles.icon, { tintColor: focused ? "#A40E4C" : "#C7547F" }]}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="badges"
          options={{
            title: "Badges",
            tabBarIcon: ({ focused }) => (
              <Image
                source={require("../../components/icons/award-star-rounded.png")}
                style={[styles.icon, { tintColor: focused ? "#A40E4C" : "#C7547F" }]}
              />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

/* ------------------ STYLES ---------------------- */
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  waveContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    width: "100%",
    height: 120,
  },

  headerHome: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 10,
  },

  headerCentered: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },

  logo: {
    fontFamily: "LeckerliOne-Regular",
    fontSize: 32,
    color: "#fff",
  },

  icon: {
    width: 24,
    height: 24,
  },
});
