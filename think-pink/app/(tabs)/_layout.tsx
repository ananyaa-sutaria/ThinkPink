import React, { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { View, Text, Dimensions, StyleSheet } from "react-native";
import { Image } from "react-native";
import * as Font from "expo-font";

import HeaderWave from "../../components/HeaderWave";
import BottomNav from "../../components/BottomNav";
import AccountButton from "../../components/AccountButton";

const { width: screenWidth } = Dimensions.get("window");

// Load local fonts
const useLocalFonts = () => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Font.loadAsync({
      "LeckerliOne-Regular": require("../../assets/fonts/Leckerli_One/LeckerliOne-Regular.ttf"),
      "Onest": require("../../assets/fonts/Onest/static/Onest-Regular.ttf"),
      "Onest-Bold": require("../../assets/fonts/Onest/static/Onest-Bold.ttf"),
    }).then(() => setLoaded(true));
  }, []);

  return loaded;
};

export default function TabsLayout() {
  const fontsLoaded = useLocalFonts();
  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={({ route }) => ({
          headerTitle: () => (
            <View style={styles.headerContent}>
              <Text style={styles.logo}>Think Pink</Text>
              <AccountButton />
            </View>
          ),
          headerRight: undefined,
          headerBackground: () => <HeaderWave style={styles.wave} scale={1.3} fill="#A40E4C" />,
          headerTitleAlign: "left",
          headerStyle: { backgroundColor: "transparent" },
          headerTintColor: "#fff",

          tabBarBackground: () => <BottomNav scale={1.2} fill="#7b2f4f" />,

          tabBarStyle: {
            backgroundColor: "transparent",
            borderTopWidth: 0,
            elevation: 0,
            height: 60, // move nav higher/lower
            position: "absolute",
          },

          tabBarActiveTintColor: "#A40E4C",
          tabBarInactiveTintColor: "#C7547F",

          tabBarIcon: ({ focused }) => {
            let iconSource;
            switch (route.name) {
              case "learn":
                iconSource = require("../../components/icons/book-ribbon-rounded.png");
                break;
              case "impact":
                iconSource = require("../../components/icons/heart-smile-rounded.png");
                break;
              case "index":
                iconSource = require("../../components/icons/family-home-outline-rounded.png");
                break;
              case "log":
                iconSource = require("../../components/icons/Vector.png");
                break;
              case "badges":
                iconSource = require("../../components/icons/award-star-rounded.png");
                break;
              default:
                iconSource = require("../../components/icons/family-home-outline-rounded.png");
            }
            return <Image source={iconSource} style={{ width: 24, height: 24, tintColor: focused ? "#A40E4C" : "#C7547F" }} />;
          },
        })}
      >
        <Tabs.Screen name="learn" options={{ title: "Learn" }} />
        <Tabs.Screen name="impact" options={{ title: "Impact" }} />
        <Tabs.Screen name="index" options={{ title: "Home" }} />
        <Tabs.Screen name="log" options={{ title: "Flow" }} />
        <Tabs.Screen name="badges" options={{ title: "Badges" }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  wave: {
    position: "absolute",
    top: 0,
    left: 0,
    width: screenWidth,
    height: 150,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: screenWidth - 32,
  },
  logo: {
    fontFamily: "LeckerliOne-Regular",
    fontSize: 32,
    color: "#fff",
    flexShrink: 1,
  },
});
