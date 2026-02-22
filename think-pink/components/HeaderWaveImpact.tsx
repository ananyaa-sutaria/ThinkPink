import React from "react";
import { View, ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

interface HeaderProps {
  scale?: number;
  fill?: string;
  style?: ViewStyle;
}

export default function HeaderImpact({ scale = 1, fill = "#A40E4C", style }: HeaderProps) {
  return (
    <View style={style}>
      <Svg width={393 * scale} height={93 * scale} viewBox="0 0 393 93" fill="none">
        <Path
          fill={fill}
          d="M54 64.302c38 43.431 64.5 17.485 88.5 17.485S202 112.246 268 72.762c66-39.483 68 0 95 0s30-19.741 30-19.741V0H0v49.072s16-28.202 54 15.23Z"
        />
      </Svg>
    </View>
  );
}