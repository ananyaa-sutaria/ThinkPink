// components/AnimatedHeader.tsx
import React, { useEffect } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedProps,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type HeaderProps = {
  title: string;
  wavePath: string; // SVG path string for this header
  align: "left" | "center";
  transition: number; // trigger animation on change
};

const AnimatedPath = Animated.createAnimatedComponent(Path);

export default function AnimatedHeader({ title, wavePath, align, transition }: HeaderProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 500 }, () => {
      progress.value = 0; // reset for next animation
    });
  }, [transition]);

  const animatedProps = useAnimatedProps(() => ({
    d: wavePath, // for simplicity: can use interpolatePath from redash for smooth morph
  }));

  return (
    <View style={styles.container}>
      <Svg width={SCREEN_WIDTH} height={150} style={styles.svg}>
        <AnimatedPath animatedProps={animatedProps} fill="#A40E4C" />
      </Svg>
      <View style={[styles.textContainer, { alignItems: align === "left" ? "flex-start" : "center" }]}>
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 150,
    position: "relative",
  },
  svg: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  textContainer: {
    position: "absolute",
    bottom: 20,
    width: "100%",
    paddingHorizontal: 25,
  },
  title: {
    fontFamily: "LeckerliOne-Regular",
    fontSize: 32,
    color: "#fff",
  },
});