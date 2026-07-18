import React from "react";
import { View } from "react-native";

// Deterministic bar pattern approximating the welcome-screen barcode art.
const BARS = [
  3, 1.5, 6, 2, 1.5, 4, 9, 2, 1.5, 6, 3, 1.5, 9, 4, 2, 6, 1.5, 3, 9, 2, 4,
  1.5, 6, 2, 3, 1.5, 8, 2, 5, 1.5,
];
const GAPS = [
  2, 3, 2, 4, 2, 2, 3, 2, 4, 2, 3, 2, 2, 3, 4, 2, 3, 2, 2, 4, 2, 3, 2, 2, 3,
  4, 2, 3, 2, 0,
];

export function Barcode({
  color,
  height = 150,
}: {
  color: string;
  height?: number;
}) {
  return (
    <View style={{ flexDirection: "row", height, alignItems: "stretch" }}>
      {BARS.map((w, i) => (
        <React.Fragment key={i}>
          <View style={{ width: w, backgroundColor: color }} />
          <View style={{ width: GAPS[i] }} />
        </React.Fragment>
      ))}
    </View>
  );
}
