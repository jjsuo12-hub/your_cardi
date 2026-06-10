import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Tone = 'danger' | 'amber' | 'stable' | 'neutral';

type Props = {
  title: string;
  description: string;
  news2Score: number;
  specialCriteriaCount: number;
  actionText: string;
  reevaluationText: string;
  tone: Tone;
};

const toneMap = {
  danger: { border: '#D64545', background: '#FFF5F5', title: '#B42318' },
  amber: { border: '#F5A623', background: '#FFF8E8', title: '#8A5A00' },
  stable: { border: '#2EAD6B', background: '#F3FBF6', title: '#1D7F4A' },
  neutral: { border: '#A7B4BE', background: '#F5F7F9', title: '#52616B' },
} as const;

export function ResultCard({
  title,
  description,
  news2Score,
  specialCriteriaCount,
  actionText,
  reevaluationText,
  tone,
}: Props) {
  const colors = toneMap[tone];

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.background }]}>
      <Text style={[styles.resultTitle, { color: colors.title }]}>{title}</Text>
      <Text style={styles.resultDescription}>{description}</Text>
      <View style={styles.metaList}>
        <Text style={styles.metaText}>NEWS2 총점: {news2Score}점</Text>
        <Text style={styles.metaText}>병동 특수 기준 해당 개수: {specialCriteriaCount}개</Text>
        <Text style={styles.metaText}>권장 조치: {actionText}</Text>
        <Text style={styles.metaText}>재평가/중단 기준: {reevaluationText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 28,
  },
  resultDescription: {
    color: '#1F2933',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  metaList: {
    gap: 6,
  },
  metaText: {
    color: '#52616B',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
});
