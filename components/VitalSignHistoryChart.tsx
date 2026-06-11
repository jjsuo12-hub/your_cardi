import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { VitalDataSource, VitalMetricType, generateDummyVitalHistory } from '../utils/generateDummyVitalHistory';

type SelectedPoint = {
  index: number;
  x: number;
  y: number;
  time: string;
  minutesAgo: number;
  value: number;
  unit: string;
  metricType: VitalMetricType;
};

type VitalSignHistoryChartProps = {
  activeMetric: VitalMetricType | null;
  collapsed: boolean;
  dataSource?: VitalDataSource;
  metricType: VitalMetricType;
  onToggleCollapse: () => void;
  setActiveMetric: (metricType: VitalMetricType | null) => void;
};

const width = 390;
const height = 224;
const plotLeft = 42;
const plotRight = 374;
const plotTop = 22;
const plotBottom = 166;
const tooltipPaddingHorizontal = 8;
const tooltipPaddingVertical = 5;
const tooltipLineHeight = 16;
const tooltipFontSize = 12;
const tooltipMinWidth = 112;
const tooltipMaxWidth = 184;
const tooltipHeight = tooltipLineHeight * 2 + tooltipPaddingVertical * 2;
const appFontFamily =
  Platform.OS === 'web'
    ? 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    : Platform.OS === 'ios'
      ? 'System'
      : 'sans-serif';

const configs = {
  hr: {
    title: 'HR History',
    yLabel: 'HR',
    unit: 'bpm',
    min: 40,
    max: 140,
    ticks: [40, 60, 80, 100, 120, 140],
    color: '#2BAE9E',
    footer: 'HR demo range: 82-104 bpm',
    status: 'Stable demo',
    statusColor: '#2EAD6B',
  },
  spo2: {
    title: 'SpO2 History',
    yLabel: 'SpO2',
    unit: '%',
    min: 88,
    max: 100,
    ticks: [88, 90, 92, 94, 96, 98, 100],
    color: '#1E5B8C',
    footer: 'SpO2 demo range: 94-99%',
    status: 'Stable demo',
    statusColor: '#2EAD6B',
  },
  rr: {
    title: 'RR History',
    yLabel: 'RR',
    unit: 'breaths/min',
    min: 8,
    max: 32,
    ticks: [8, 12, 16, 20, 24, 28, 32],
    color: '#F5A623',
    footer: 'RR demo range: 14-24 breaths/min',
    status: 'Watch demo',
    statusColor: '#F5A623',
  },
  skinTemp: {
    title: 'Skin Temperature History',
    yLabel: 'Skin Temp',
    unit: '°C',
    min: 32,
    max: 39,
    ticks: [32, 33, 34, 35, 36, 37, 38, 39],
    color: '#D64545',
    footer: 'Skin temperature demo range: 35.6-37.8°C',
    status: 'Watch demo',
    statusColor: '#F5A623',
  },
} as const;

export function VitalSignHistoryChart({
  activeMetric,
  collapsed,
  dataSource = 'dummy',
  metricType,
  onToggleCollapse,
  setActiveMetric,
}: VitalSignHistoryChartProps) {
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(null);
  const config = configs[metricType];
  const points = useMemo(() => generateDummyVitalHistory(metricType), [metricType]);
  const currentValue = points[points.length - 1].value;
  const polyline = points.map((point, index) => `${mapX(index)},${mapY(point.value, config.min, config.max)}`).join(' ');
  const visibleTooltip = activeMetric === metricType ? selectedPoint : null;

  const clearSelection = () => {
    setSelectedPoint(null);
    setActiveMetric(null);
  };

  const collapseCard = () => {
    clearSelection();
    onToggleCollapse();
  };

  const selectPoint = (index: number) => {
    const point = points[index];
    if (visibleTooltip?.index === index) {
      clearSelection();
      return;
    }

    setActiveMetric(metricType);
    setSelectedPoint({
      index,
      x: mapX(index),
      y: mapY(point.value, config.min, config.max),
      time: point.label,
      minutesAgo: point.minutesAgo,
      value: point.value,
      unit: config.unit,
      metricType,
    });
  };

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.headerRow}
        onPress={() => {
          if (!collapsed && activeMetric === metricType) {
            clearSelection();
          }
          onToggleCollapse();
        }}
      >
        <View style={styles.headerTextBlock}>
          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.subtitle}>
            {config.yLabel} · 10분 간격 · 최근 2시간 · {dataSource === 'dummy' ? '더미 데이터' : '연동 데이터'}
          </Text>
        </View>
        <View style={styles.headerBadgeGroup}>
          <View style={[styles.statusBadge, { backgroundColor: config.statusColor }]}>
            <Text style={styles.statusBadgeText}>{config.status}</Text>
          </View>
          <Text style={styles.collapseHint}>{collapsed ? '탭하여 펼치기' : '다시 탭하여 접기'}</Text>
        </View>
      </Pressable>

      {!collapsed ? (
        <Pressable style={styles.bodySection} onPress={collapseCard}>
          <View style={styles.currentRow}>
            <Text style={styles.currentLabel}>{config.yLabel}</Text>
            <Text style={styles.currentValue}>
              {formatValue(currentValue, metricType)} <Text style={styles.currentUnit}>{config.unit}</Text>
            </Text>
          </View>

          <Pressable style={styles.chartWrap} onPress={collapseCard}>
            <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
              <Rect
                x="0"
                y="0"
                width={width}
                height={height}
                fill="#FFFFFF"
                onPress={(event) => {
                  event.stopPropagation?.();
                  collapseCard();
                }}
              />
              {config.ticks.map((tick) => {
                const y = mapY(tick, config.min, config.max);
                return (
                  <React.Fragment key={`y-${tick}`}>
                    <Line x1={plotLeft} y1={y} x2={plotRight} y2={y} stroke="#EEF2F4" strokeWidth="1" />
                    <SvgText x="5" y={y + 4} fill="#6B7280" fontSize="9" fontWeight="700">
                      {tick}
                    </SvgText>
                  </React.Fragment>
                );
              })}
              {points.map((point, index) => {
                const x = mapX(index);
                const showLabel = index % 2 === 0 || index === points.length - 1;
                return (
                  <React.Fragment key={`x-${point.minutesAgo}`}>
                    <Line x1={x} y1={plotTop} x2={x} y2={plotBottom} stroke="#F2F5F7" strokeWidth="1" />
                    {showLabel && (
                      <SvgText x={x - 13} y="204" fill="#6B7280" fontSize="9" fontWeight="700">
                        {point.minutesAgo === 0 ? '현재' : `-${point.minutesAgo}`}
                      </SvgText>
                    )}
                  </React.Fragment>
                );
              })}
              <SvgText x="176" y="220" fill="#6B7280" fontSize="10" fontWeight="800">
                minute
              </SvgText>
              <Polyline points={polyline} stroke={config.color} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              {points.map((point, index) => {
                const cx = mapX(index);
                const cy = mapY(point.value, config.min, config.max);
                const selected = visibleTooltip?.index === index;
                const eventProps = Platform.OS === 'web'
                  ? {
                      onMouseEnter: () => selectPoint(index),
                    }
                  : {};

                return (
                  <React.Fragment key={`point-${index}`}>
                    {selected ? <Circle cx={cx} cy={cy} r="10" fill={config.color} opacity="0.16" /> : null}
                    <Circle
                      cx={cx}
                      cy={cy}
                      r={selected ? 5 : index === points.length - 1 ? 4 : 3}
                      fill={config.color}
                      stroke="#FFFFFF"
                      strokeWidth="1.8"
                    />
                    <Circle
                      cx={cx}
                      cy={cy}
                      r="12"
                      fill="transparent"
                      onPress={(event) => {
                        event.stopPropagation?.();
                        selectPoint(index);
                      }}
                      {...eventProps}
                    />
                  </React.Fragment>
                );
              })}
              {visibleTooltip ? <SvgTooltip point={visibleTooltip} color={config.color} label={config.yLabel} /> : null}
            </Svg>
          </Pressable>

          {visibleTooltip ? (
            <View pointerEvents="none" style={styles.tooltipCard}>
              <Text style={styles.tooltipTitle}>선택 기록</Text>
              <Text style={styles.tooltipText}>
                {configs[visibleTooltip.metricType].yLabel} · {visibleTooltip.minutesAgo === 0 ? '현재' : `${visibleTooltip.minutesAgo}분 전`} ·{' '}
                {visibleTooltip.time}
              </Text>
              <Text style={[styles.tooltipValue, { color: config.color }]}>
                {formatValue(visibleTooltip.value, metricType)} {visibleTooltip.unit}
              </Text>
            </View>
          ) : null}

          <Text style={styles.footer}>{config.footer}</Text>
          <Text style={styles.disclaimer}>상태 배지는 데모 표시이며 실제 임상판단, 진단, 처방에 사용할 수 없습니다.</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function SvgTooltip({ color, label, point }: { color: string; label: string; point: SelectedPoint }) {
  const valueLine = `${label}: ${formatValue(point.value, point.metricType)} ${point.unit}`;
  const timeLine = `Time: ${point.time}`;
  const tooltipWidth = clamp(
    Math.max(valueLine.length, timeLine.length) * 7 + tooltipPaddingHorizontal * 2,
    tooltipMinWidth,
    tooltipMaxWidth,
  );
  const above = point.y > plotTop + tooltipHeight + 12;
  const x = clamp(point.x - tooltipWidth / 2, plotLeft, plotRight - tooltipWidth);
  const y = above ? point.y - tooltipHeight - 14 : point.y + 14;
  const tailX = clamp(point.x, x + 10, x + tooltipWidth - 10);
  const tailPath = above
    ? `M ${tailX - 5} ${y + tooltipHeight} L ${tailX} ${y + tooltipHeight + 7} L ${tailX + 5} ${y + tooltipHeight} Z`
    : `M ${tailX - 5} ${y} L ${tailX} ${y - 7} L ${tailX + 5} ${y} Z`;

  return (
    <React.Fragment>
      <Rect x={x} y={y} width={tooltipWidth} height={tooltipHeight} rx="8" fill="#1F2933" pointerEvents="none" />
      <Path d={tailPath} fill="#1F2933" pointerEvents="none" />
      <SvgText
        x={x + tooltipPaddingHorizontal}
        y={y + tooltipPaddingVertical + 11}
        fill="#FFFFFF"
        fontFamily={appFontFamily}
        fontSize={tooltipFontSize}
        fontWeight="800"
        letterSpacing="0"
        pointerEvents="none"
      >
        {valueLine}
      </SvgText>
      <SvgText
        x={x + tooltipPaddingHorizontal}
        y={y + tooltipPaddingVertical + 11 + tooltipLineHeight}
        fill="#FFFFFF"
        fontFamily={appFontFamily}
        fontSize={tooltipFontSize}
        fontWeight="700"
        letterSpacing="0"
        pointerEvents="none"
      >
        {timeLine}
      </SvgText>
      <Circle cx={point.x} cy={point.y} r="3.2" fill={color} stroke="#FFFFFF" strokeWidth="1.4" pointerEvents="none" />
    </React.Fragment>
  );
}

function mapX(index: number) {
  return plotLeft + (index / 12) * (plotRight - plotLeft);
}

function mapY(value: number, min: number, max: number) {
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return plotBottom - ratio * (plotBottom - plotTop);
}

function formatValue(value: number, metricType: VitalMetricType) {
  if (metricType === 'skinTemp') return value.toFixed(1);
  return Math.round(value).toString();
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D6E2E8',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  headerTextBlock: {
    flex: 1,
  },
  headerBadgeGroup: {
    alignItems: 'flex-end',
    gap: 6,
  },
  title: {
    color: '#1F2933',
    fontSize: 17,
    fontWeight: '900',
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  collapseHint: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '700',
  },
  currentRow: {
    borderRadius: 8,
    backgroundColor: '#F8FBFC',
    padding: 10,
  },
  currentLabel: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '800',
  },
  currentValue: {
    color: '#1F2933',
    fontSize: 25,
    fontWeight: '900',
    marginTop: 2,
  },
  currentUnit: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '800',
  },
  bodySection: {
    gap: 10,
  },
  chartWrap: {
    height,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D6E2E8',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  tooltipCard: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D6E2E8',
    backgroundColor: '#F8FBFC',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  tooltipTitle: {
    color: '#1F2933',
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    letterSpacing: 0,
  },
  tooltipText: {
    color: '#6B7280',
    fontFamily: appFontFamily,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    letterSpacing: 0,
    marginTop: 2,
  },
  tooltipValue: {
    fontFamily: appFontFamily,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 3,
  },
  footer: {
    color: '#1F2933',
    fontSize: 12,
    fontWeight: '900',
  },
  disclaimer: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
});
