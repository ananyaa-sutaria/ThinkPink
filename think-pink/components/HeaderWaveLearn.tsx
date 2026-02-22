import React from "react";
import { View, ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

interface HeaderProps {
  scale?: number;
  fill?: string;
  style?: ViewStyle;
}

export default function HeaderCycle({ scale = 1, fill = "#A40E4C", style }: HeaderProps) {
  return (
    <View style={style}>
      <Svg width={393 * scale} height={108 * scale} viewBox="0 0 393 108" fill="none">
        <Path
          fill={fill}
          fillRule="evenodd"
          clipRule="evenodd"
          d="M0 96 11.85 92c9.874-4 31.597-20 53.32-16 21.724 4 43.448 20 65.172 16 21.723-4 32.133-15 67.145-16 35.013-1 43.448 6 65.171 12 21.724 6 29 0 65.171 0 36.171 0 43.447 12 53.322 16L393 108V0H0v96Z"
        />
      </Svg>
    </View>
  );
}