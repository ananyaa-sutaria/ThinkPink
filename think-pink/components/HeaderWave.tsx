import React from "react";
import { View, ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

interface HeaderWaveProps {
  scale?: number;
  fill?: string;
  style?: ViewStyle;
}

export default function HeaderWave({ scale = 1, fill = "#A40E4C", style }: HeaderWaveProps) {
  return (
    <View style={style}>
      <Svg width={393 * scale} height={115 * scale} viewBox="0 0 393 115" fill="none">
        <Path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M393 0L377 10C360 20 352 30 313 45.5C280 49.5 297.5 44.5 264.5 48.5C232.5 52.5 237 52.8039 190 74C143 95.1961 83.5 70 48.5 86.5C13.5 103 0 115 0 115V0H16C33 0 65 0 98 0C131 0 164 0 196 0C229 0 262 0 295 0C327 0 360 0 377 0H393Z"
          fill={fill}
        />
      </Svg>
    </View>
  );
}