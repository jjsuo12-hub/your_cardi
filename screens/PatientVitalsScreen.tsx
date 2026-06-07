import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DummyEcgChart } from '../components/DummyEcgChart';

type PatientVitalsScreenProps = {
  patientName?: string;
  roomBed?: string;
  reason?: string;
};

export function PatientVitalsScreen({
  patientName = '김○○',
  roomBed = '601-1',
  reason = '이식 수술 후 지속 모니터링',
}: PatientVitalsScreenProps) {
  return (
    <View style={styles.screen}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>적용 환자 생체정보</Text>
        <View style={styles.demoBadge}>
          <Text style={styles.demoBadgeText}>DEMO / 더미 데이터</Text>
        </View>
      </View>

      <View style={styles.patientCard}>
        <Text style={styles.patientTitle}>환자 정보 카드</Text>
        <Text style={styles.patientText}>환자명: {patientName}</Text>
        <Text style={styles.patientText}>병실: {roomBed}</Text>
        <Text style={styles.patientText}>적용 사유: {reason}</Text>
      </View>

      <DummyEcgChart dataSource="dummy" />

      <Text style={styles.footer}>본 화면은 프로토타입 시연용이며 실제 환자 정보와 연결되어 있지 않습니다.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    color: '#1F2933',
    fontSize: 20,
    fontWeight: '900',
  },
  demoBadge: {
    borderRadius: 999,
    backgroundColor: '#E9F8F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  demoBadgeText: {
    color: '#1E5B8C',
    fontSize: 12,
    fontWeight: '900',
  },
  patientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D6E2E8',
    padding: 12,
  },
  patientTitle: {
    color: '#1F2933',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },
  patientText: {
    color: '#52616B',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 22,
  },
  footer: {
    color: '#D64545',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
});
