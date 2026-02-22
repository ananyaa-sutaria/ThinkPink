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
          d="M0 71.381 16.375 68c16.375-2.379 49.125-7.137 81.875 0 32.75 7.139 65.5 26.174 98.25 23.795 32.75-2.38 76.25-21.113 109-33.01 32.75-11.897 54.75-16.957 71.125-16.957H393V0H0v71.381Z"
        />
      </Svg>
    </View>
  );
}