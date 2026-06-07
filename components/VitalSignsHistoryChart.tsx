import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { VitalMetricType } from '../utils/generateDummyVitalHistory';
import { VitalSignHistoryChart } from './VitalSignHistoryChart';

export function VitalSignsHistoryChart() {
  const [activeMetric, setActiveMetric] = useState<VitalMetricType | null>(null);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Vital Signs History</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>DEMO / 더미 데이터</Text>
        </View>
      </View>
      <Text style={styles.notice}>시연용 더미 생체정보입니다. 실제 환자 데이터가 아닙니다.</Text>
      <Text style={styles.caption}>10분 간격으로 생성된 시연용 생체정보입니다. 실제 환자 데이터가 아닙니다.</Text>
      <VitalSignHistoryChart activeMetric={activeMetric} metricType="hr" setActiveMetric={setActiveMetric} dataSource="dummy" />
      <VitalSignHistoryChart activeMetric={activeMetric} metricType="spo2" setActiveMetric={setActiveMetric} dataSource="dummy" />
      <VitalSignHistoryChart activeMetric={activeMetric} metricType="rr" setActiveMetric={setActiveMetric} dataSource="dummy" />
      <VitalSignHistoryChart activeMetric={activeMetric} metricType="skinTemp" setActiveMetric={setActiveMetric} dataSource="dummy" />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    color: '#1F2933',
    fontSize: 19,
    fontWeight: '900',
  },
  badge: {
    borderRadius: 999,
    backgroundColor: '#E9F8F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#1E5B8C',
    fontSize: 12,
    fontWeight: '900',
  },
  notice: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D6E2E8',
    backgroundColor: '#FFFFFF',
    color: '#1F2933',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 19,
    padding: 10,
  },
  caption: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
});
