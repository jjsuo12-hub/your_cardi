import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { EcgDataSource, EcgPoint, generateDummyEcg } from '../utils/generateDummyEcg';

type DummyEcgChartProps = {
  dataSource?: EcgDataSource;
  onHeartRateChange?: (heartRate: number) => void;
};

const SAMPLE_RATE = 60;
const UPDATE_MS = 80;
const ROLLING_WINDOW_SEC = 6;
const POINTS_PER_TICK = Math.round((SAMPLE_RATE * UPDATE_MS) / 1000);

export function DummyEcgChart({ dataSource = 'dummy', onHeartRateChange }: DummyEcgChartProps) {
  const [points, setPoints] = useState<EcgPoint[]>(() => {
    const sample = generateDummyEcg({
      startTimeSec: 0,
      count: ROLLING_WINDOW_SEC * SAMPLE_RATE,
      sampleRate: SAMPLE_RATE,
      previousHeartRate: 88,
    });
    return sample.points;
  });
  const [heartRate, setHeartRate] = useState(88);
  const timeRef = useRef(ROLLING_WINDOW_SEC);
  const heartRateRef = useRef(88);

  useEffect(() => {
    if (dataSource !== 'dummy') return undefined;

    const timer = setInterval(() => {
      const sample = generateDummyEcg({
        startTimeSec: timeRef.current,
        count: POINTS_PER_TICK,
        sampleRate: SAMPLE_RATE,
        previousHeartRate: heartRateRef.current,
      });
      timeRef.current += POINTS_PER_TICK / SAMPLE_RATE;
      heartRateRef.current = sample.heartRate;
      setHeartRate(sample.heartRate);
      onHeartRateChange?.(sample.heartRate);
      setPoints((current) => {
        const next = [...current, ...sample.points];
        const latest = next[next.length - 1]?.timeSec ?? 0;
        return next.filter((point) => point.timeSec >= latest - ROLLING_WINDOW_SEC);
      });
    }, UPDATE_MS);

    return () => clearInterval(timer);
  }, [dataSource, onHeartRateChange]);

  const latestTime = points[points.length - 1]?.timeSec ?? ROLLING_WINDOW_SEC;
  const path = useMemo(() => buildPath(points, latestTime), [points, latestTime]);
  const status = heartRate >= 60 && heartRate <= 100 ? '안정' : heartRate < 60 || heartRate > 120 ? '위험' : '주의';
  const statusColor = status === '안정' ? '#2EAD6B' : status === '주의' ? '#F5A623' : '#D64545';
  const lastUpdated = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>ECG Waveform</Text>
          <Text style={styles.subtitle}>Time (sec) · ECG amplitude (mV)</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>DEMO / 더미 데이터</Text>
        </View>
      </View>

      <Text style={styles.notice}>시연용 더미 ECG 데이터입니다. 실제 환자 데이터가 아닙니다.</Text>

      <View style={styles.chartWrap}>
        <Svg width="100%" height="260" viewBox="0 0 390 260" preserveAspectRatio="none">
          <Rect x="0" y="0" width="390" height="260" fill="#FFFFFF" />
          {[-1.5, -1, -0.5, 0, 0.5, 1, 1.5].map((tick) => {
            const y = mapY(tick);
            return (
              <React.Fragment key={`y-${tick}`}>
                <Line x1="42" y1={y} x2="374" y2={y} stroke={tick === 0 ? '#B7C1C8' : '#EEF2F4'} strokeWidth={tick === 0 ? 1.8 : 1} />
                <SvgText x="4" y={y + 4} fill="#52616B" fontSize="10" fontWeight="700">
                  {tick > 0 ? `+${tick.toFixed(1)}` : tick.toFixed(1)}
                </SvgText>
              </React.Fragment>
            );
          })}
          {[0, 1, 2, 3, 4, 5, 6].map((tick) => {
            const x = mapX(tick);
            return (
              <React.Fragment key={`x-${tick}`}>
                <Line x1={x} y1="16" x2={x} y2="218" stroke="#EEF2F4" strokeWidth="1" />
                <SvgText x={x - 4} y="244" fill="#52616B" fontSize="10" fontWeight="700">
                  {tick}
                </SvgText>
              </React.Fragment>
            );
          })}
          <SvgText x="168" y="257" fill="#52616B" fontSize="11" fontWeight="800">
            Time (sec)
          </SvgText>
          <SvgText x="5" y="13" fill="#52616B" fontSize="11" fontWeight="800">
            mV
          </SvgText>
          <Path d={path} stroke="#2BAE9E" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {points.length > 0 && (
            <Circle
              cx={mapX(Math.min(6, Math.max(0, points[points.length - 1].timeSec - (latestTime - ROLLING_WINDOW_SEC))))}
              cy={mapY(points[points.length - 1].valueMv)}
              r="3.4"
              fill="#2BAE9E"
            />
          )}
        </Svg>
      </View>

      <View style={styles.statusGrid}>
        <StatusItem label="HR" value={`${heartRate} bpm`} accent={statusColor} />
        <StatusItem label="Rhythm" value="Demo sinus-like waveform" />
        <StatusItem label="Signal" value="Good" />
        <StatusItem label="Data type" value="Dummy data" />
        <StatusItem label="Last updated" value={lastUpdated} />
        <StatusItem label="Status" value={`${status} · 시연용`} accent={statusColor} />
      </View>

      <Text style={styles.disclaimer}>상태 표시는 시연용이며 실제 임상판단, 진단, 처방에 사용할 수 없습니다.</Text>
    </View>
  );
}

function StatusItem({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={[styles.statusItem, accent ? { borderLeftColor: accent } : null]}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={[styles.statusValue, accent ? { color: accent } : null]}>{value}</Text>
    </View>
  );
}

function buildPath(points: EcgPoint[], latestTime: number) {
  const start = latestTime - ROLLING_WINDOW_SEC;
  return points
    .map((point, index) => {
      const x = mapX(point.timeSec - start);
      const y = mapY(point.valueMv);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function mapX(sec: number) {
  return 42 + (sec / 6) * 332;
}

function mapY(mv: number) {
  const clamped = Math.max(-1.5, Math.min(1.5, mv));
  return 16 + ((1.5 - clamped) / 3) * 202;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D6E2E8',
    padding: 12,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: {
    color: '#1F2933',
    fontSize: 18,
    fontWeight: '900',
  },
  subtitle: {
    color: '#52616B',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  badge: {
    borderRadius: 999,
    backgroundColor: '#EAF3F9',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  badgeText: {
    color: '#1E5B8C',
    fontSize: 12,
    fontWeight: '900',
  },
  notice: {
    color: '#1F2933',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  chartWrap: {
    height: 260,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D6E2E8',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusItem: {
    flexGrow: 1,
    minWidth: 128,
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderLeftColor: '#2BAE9E',
    borderColor: '#D6E2E8',
    backgroundColor: '#F9FCFD',
    padding: 10,
  },
  statusLabel: {
    color: '#52616B',
    fontSize: 12,
    fontWeight: '800',
  },
  statusValue: {
    color: '#1F2933',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 3,
  },
  disclaimer: {
    color: '#D64545',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
  },
});
