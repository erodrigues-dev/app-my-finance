import React from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

type Slice = { label: string; value: number; color: string };

type Props = {
  data: Slice[];
  size?: number;
};

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number
): { x: number; y: number } {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

export function PieChart({ data, size = 200 }: Props) {
  if (data.length === 0) return null;

  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total <= 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 8;

  let currentAngle = 0;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((slice, i) => {
          const sweepAngle = (slice.value / total) * 360;
          const startAngle = currentAngle;
          const endAngle = currentAngle + sweepAngle;
          currentAngle = endAngle;

          const path = describeArc(cx, cy, r, startAngle, endAngle);

          return (
            <Path
              key={i}
              d={path}
              fill={slice.color}
              stroke="transparent"
              strokeWidth={1}
            />
          );
        })}
      </Svg>
    </View>
  );
}
