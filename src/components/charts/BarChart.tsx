import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Rect, Text as SvgText, Line, Polyline, Circle } from 'react-native-svg';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppText } from '@/components/ui';

export interface ChartDatum {
  label: string;
  value: number;
  /** Optional accessibility label for the datum. */
  a11y?: string;
}

interface BaseProps {
  data: ChartDatum[];
  height?: number;
  /** Text alternative read by screen readers (chart summary). */
  summary: string;
  color?: string;
  /** Show every n-th label on the x axis. */
  labelEvery?: number;
  maxValue?: number;
}

/**
 * Lightweight SVG bar chart (no extra chart dependency). Values of zero render as an empty
 * slot, never as invented data. Includes a textual summary for accessibility.
 */
export function BarChart({ data, height = 160, summary, color, labelEvery = 1, maxValue }: BaseProps) {
  const theme = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.min(windowWidth - 64, 600);
  const padding = { top: 12, bottom: 24, left: 8, right: 8 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const max = Math.max(1, maxValue ?? Math.max(...data.map((d) => d.value)));
  const gap = 4;
  const barW = data.length > 0 ? Math.max(2, (innerW - gap * (data.length - 1)) / data.length) : 0;
  const fill = color ?? theme.colors.primary;
  return (
    <View accessible accessibilityLabel={summary} style={{ gap: 6 }}>
      <Svg width={width} height={height}>
        <Line x1={padding.left} x2={width - padding.right} y1={padding.top + innerH} y2={padding.top + innerH} stroke={theme.colors.border} strokeWidth={1} />
        {data.map((d, i) => {
          const h = (d.value / max) * innerH;
          const x = padding.left + i * (barW + gap);
          const y = padding.top + innerH - h;
          return (
            <React.Fragment key={`${d.label}-${i}`}>
              {d.value > 0 ? <Rect x={x} y={y} width={barW} height={h} rx={Math.min(4, barW / 2)} fill={fill} /> : null}
              {d.value > 0 && data.length <= 14 ? (
                <SvgText x={x + barW / 2} y={y - 3} fontSize={10} fill={theme.colors.textSecondary} textAnchor="middle">
                  {d.value}
                </SvgText>
              ) : null}
              {i % labelEvery === 0 ? (
                <SvgText x={x + barW / 2} y={height - 8} fontSize={10} fill={theme.colors.textSecondary} textAnchor="middle">
                  {d.label}
                </SvgText>
              ) : null}
            </React.Fragment>
          );
        })}
      </Svg>
      <AppText variant="caption" tone="secondary">
        {summary}
      </AppText>
    </View>
  );
}

interface LineProps {
  data: ChartDatum[];
  height?: number;
  summary: string;
  color?: string;
  labelEvery?: number;
  min?: number;
  max?: number;
}

export function LineChart({ data, height = 160, summary, color, labelEvery = 1, min, max }: LineProps) {
  const theme = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.min(windowWidth - 64, 600);
  const padding = { top: 12, bottom: 24, left: 12, right: 12 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const values = data.map((d) => d.value);
  const lo = min ?? Math.min(...values, 0);
  const hi = Math.max(max ?? Math.max(...values, 1), lo + 1);
  const stroke = color ?? theme.colors.accent;
  const points = data.map((d, i) => {
    const x = padding.left + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2);
    const y = padding.top + innerH - ((d.value - lo) / (hi - lo)) * innerH;
    return { x, y, d };
  });
  return (
    <View accessible accessibilityLabel={summary} style={{ gap: 6 }}>
      <Svg width={width} height={height}>
        <Line x1={padding.left} x2={width - padding.right} y1={padding.top + innerH} y2={padding.top + innerH} stroke={theme.colors.border} strokeWidth={1} />
        {points.length > 1 ? <Polyline points={points.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinejoin="round" /> : null}
        {points.map((p, i) => (
          <React.Fragment key={i}>
            <Circle cx={p.x} cy={p.y} r={4} fill={stroke} />
            {i % labelEvery === 0 ? (
              <SvgText x={p.x} y={height - 8} fontSize={10} fill={theme.colors.textSecondary} textAnchor="middle">
                {p.d.label}
              </SvgText>
            ) : null}
          </React.Fragment>
        ))}
      </Svg>
      <AppText variant="caption" tone="secondary">
        {summary}
      </AppText>
    </View>
  );
}
