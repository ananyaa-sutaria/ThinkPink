import React from "react";
import { View, ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

interface HeaderProps {
  scale?: number;
  fill?: string;
  style?: ViewStyle;
}

export default function HeaderFlow({ scale = 1, fill = "#A40E4C", style }: HeaderProps) {
  return (
    <View style={style}>
      <Svg width={393 * scale} height={93 * scale} viewBox="0 0 393 93" fill="none">
        <Path
          fill={fill}
          fillRule="evenodd"
          clipRule="evenodd"
          d="m0 47.571 16.375 10.572C32.75 68.714 56.75 89.857 89.5 84.57 122.25 79.286 125.5 76 161 73s67.5 23.143 110 11.571C313.5 73 338.5 38.143 367.5 70.5S393 111 393 111V0H0v47.571Z"
        />
      </Svg>
    </View>
  );
}