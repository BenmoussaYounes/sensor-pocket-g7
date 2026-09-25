import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

// Palette "frigo" : blancs froids, bleu givre pour la température,
// bleu-vert pour l'humidité, ambre pour la lumière intérieure (LED).
export const COLORS = {
  bg: "#EAF1F7",
  card: "#FFFFFF",
  hero: "#E4EFF8",
  handle: "#B9C8D6",
  border: "#DCE7EF",
  textDark: "#132433",
  textMuted: "#66788C",
  cold: "#2E86D6",
  coldSoft: "#DCEBFA",
  humidity: "#0E9DA8",
  amber: "#F2A93C",
  online: "#28C76F",
  offline: "#C6D0DA",
  danger: "#D64545",
  segmentBg: "#E1EAF1",
};

export function IconThermometer({ size = 22, color = COLORS.cold }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10 13.6V5a2 2 0 1 1 4 0v8.6a4.2 4.2 0 1 1-4 0Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <Line x1="12" y1="7" x2="12" y2="13.2" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Circle cx="12" cy="17.2" r="1.8" fill={color} />
    </Svg>
  );
}

export function IconDroplet({ size = 22, color = COLORS.humidity }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3c3.2 4.1 6.2 7.7 6.2 11.2A6.2 6.2 0 1 1 5.8 14.2C5.8 10.7 8.8 7.1 12 3Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconBulb({
  size = 22,
  color = COLORS.textMuted,
  filled = false,
}: {
  size?: number;
  color?: string;
  filled?: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3a6.2 6.2 0 0 0-3.6 11.2c.5.35.8.9.8 1.5V16.4h5.6v-.7c0-.6.3-1.15.8-1.5A6.2 6.2 0 0 0 12 3Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
        fill={filled ? color : "none"}
      />
      <Line x1="9.6" y1="19" x2="14.4" y2="19" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Line x1="10.4" y1="21.4" x2="13.6" y2="21.4" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

export function IconFridge({ size = 26, color = COLORS.textDark }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="5" y="2" width="14" height="20" rx="2.2" stroke={color} strokeWidth={1.6} />
      <Line x1="5" y1="9.2" x2="19" y2="9.2" stroke={color} strokeWidth={1.6} />
      <Line x1="7.8" y1="4.6" x2="7.8" y2="7" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
      <Line x1="7.8" y1="11.2" x2="7.8" y2="14.8" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
    </Svg>
  );
}

export function IconChartBars({ size = 16, color = COLORS.textDark }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="12" width="3.4" height="8" rx="1" fill={color} />
      <Rect x="10.3" y="7" width="3.4" height="13" rx="1" fill={color} />
      <Rect x="16.6" y="3" width="3.4" height="17" rx="1" fill={color} />
    </Svg>
  );
}

export function IconList({ size = 14, color = COLORS.textDark }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="4" y1="6" x2="20" y2="6" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="4" y1="12" x2="20" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="4" y1="18" x2="20" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function IconChevronLeft({ size = 18, color = COLORS.textDark }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 5.5 8.5 12l6.5 6.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconChevronRight({ size = 16, color = COLORS.textMuted }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 5.5 15.5 12 9 18.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconGauge({ size = 18, color = COLORS.textDark }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 15a8 8 0 1 1 16 0"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
      <Line x1="12" y1="15" x2="15.2" y2="10.6" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Circle cx="12" cy="15" r="1.3" fill={color} />
    </Svg>
  );
}

export function IconClock({ size = 13, color = COLORS.textMuted }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8.2" stroke={color} strokeWidth={1.6} />
      <Path d="M12 7.5V12l3 2" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconAlertTriangle({ size = 14, color = COLORS.danger }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4.2 21 19H3L12 4.2Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <Line x1="12" y1="10.5" x2="12" y2="14.5" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
      <Circle cx="12" cy="16.8" r="1" fill={color} />
    </Svg>
  );
}

export function IconRefresh({ size = 16, color = COLORS.textDark }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.5 12a7.5 7.5 0 0 1 12.6-5.4M19.5 12a7.5 7.5 0 0 1-12.6 5.4"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path d="M17.5 4.8v3.6h-3.6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6.5 19.2v-3.6h3.6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
