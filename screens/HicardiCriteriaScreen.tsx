import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AccordionCard } from '../components/AccordionCard';
import { ResultCard } from '../components/ResultCard';
import { SectionCard } from '../components/SectionCard';
import { HicardiSpecialCriteria, News2Input } from '../types/appClinicalTypes';
import { evaluateHicardiDecision } from '../utils/hicardiDecisionEngine';
import { calculateNews2 } from '../utils/news2Calculator';

type ConsciousnessValue = News2Input['consciousness'];

const initialInput = {
  rr: '',
  spo2: '',
  sbp: '',
  hr: '',
  temperature: '',
};

export function HicardiCriteriaScreen() {
  const [values, setValues] = useState(initialInput);
  const [usesSupplementalOxygen, setUsesSupplementalOxygen] = useState(false);
  const [consciousness, setConsciousness] = useState<ConsciousnessValue>('alert');
  const [specialCriteria, setSpecialCriteria] = useState<HicardiSpecialCriteria>({
    icuOrEr: false,
    highRiskSurgeryOrTransplant: false,
    age65OrOlder: false,
  });
  const [emergency, setEmergency] = useState(false);

  const parsedInput = useMemo<News2Input | null>(() => {
    const rr = Number(values.rr);
    const spo2 = Number(values.spo2);
    const sbp = Number(values.sbp);
    const pulse = Number(values.hr);
    const temperature = Number(values.temperature);
    if ([rr, spo2, sbp, pulse, temperature].some((value) => !Number.isFinite(value))) {
      return null;
    }

    return {
      rr,
      spo2,
      usesSupplementalOxygen,
      temperature,
      sbp,
      pulse,
      consciousness,
    };
  }, [consciousness, usesSupplementalOxygen, values]);

  const news2Result = useMemo(() => (parsedInput ? calculateNews2(parsedInput) : null), [parsedInput]);
  const decision = useMemo(
    () => (news2Result ? evaluateHicardiDecision(news2Result, specialCriteria, emergency) : null),
    [emergency, news2Result, specialCriteria],
  );

  const specialCriteriaCount = Object.values(specialCriteria).filter(Boolean).length;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionCard title="HiCardi 적용 기준 확인">
        <Text style={styles.description}>
          환자 개인정보를 입력하지 않고, NEWS2와 병동 특수 적용 기준을 직접 입력하여 HiCardi 적용 필요성을 확인합니다.
        </Text>
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            본 도구는 임상 판단을 대체하지 않으며, HiCardi 적용 여부는 담당 진료과 처방과 병동 기준에 따라 결정합니다.
          </Text>
        </View>
      </SectionCard>

      <SectionCard title="NEWS2 직접 입력">
        <InputRow label="호흡수 RR" value={values.rr} onChangeText={(value) => setValues((current) => ({ ...current, rr: value }))} />
        <InputRow label="SpO2" value={values.spo2} onChangeText={(value) => setValues((current) => ({ ...current, spo2: value }))} />
        <ToggleRow
          label="산소투여 여부"
          options={[
            { label: 'Room air', value: false },
            { label: '산소투여 중', value: true },
          ]}
          selected={usesSupplementalOxygen}
          onSelect={setUsesSupplementalOxygen}
        />
        <InputRow label="수축기 혈압 SBP" value={values.sbp} onChangeText={(value) => setValues((current) => ({ ...current, sbp: value }))} />
        <InputRow label="맥박수 HR" value={values.hr} onChangeText={(value) => setValues((current) => ({ ...current, hr: value }))} />
        <ToggleRow
          label="의식상태"
          options={[
            { label: 'Alert', value: 'alert' as const },
            { label: 'New confusion / Voice / Pain / Unresponsive', value: 'newConfusionOrAVPU' as const },
          ]}
          selected={consciousness}
          onSelect={setConsciousness}
        />
        <InputRow label="체온" value={values.temperature} onChangeText={(value) => setValues((current) => ({ ...current, temperature: value }))} />

        {news2Result ? (
          <View style={styles.news2Summary}>
            <Text style={styles.news2Score}>NEWS2 총점 {news2Result.totalScore}점</Text>
            <Text style={styles.scoreBand}>점수 구간: {getBandLabel(news2Result.totalScore)}</Text>
            <View style={styles.scoreGrid}>
              <ScoreLine label="RR" value={news2Result.itemScores.rr} />
              <ScoreLine label="SpO2" value={news2Result.itemScores.spo2} />
              <ScoreLine label="산소투여" value={news2Result.itemScores.oxygen} />
              <ScoreLine label="SBP" value={news2Result.itemScores.sbp} />
              <ScoreLine label="HR" value={news2Result.itemScores.pulse} />
              <ScoreLine label="의식상태" value={news2Result.itemScores.consciousness} />
              <ScoreLine label="체온" value={news2Result.itemScores.temperature} />
            </View>
          </View>
        ) : (
          <Text style={styles.helperText}>모든 NEWS2 항목을 입력하면 자동으로 점수가 계산됩니다.</Text>
        )}
      </SectionCard>

      <SectionCard
        title="병동 특수 적용 기준"
        caption="병동 특수 적용 기준은 NEWS2 점수에 합산하지 않으며, NEWS2 5–6점 또는 1–4점 환자의 HiCardi 적용 판단을 보조하기 위해 사용합니다."
      >
        <CheckCard
          title="ICU 또는 ER 경유"
          description="입원 전 또는 전동 전 ICU/ER 경유 환자"
          checked={specialCriteria.icuOrEr}
          onPress={() => setSpecialCriteria((current) => ({ ...current, icuOrEr: !current.icuOrEr }))}
        />
        <CheckCard
          title="고위험 수술 또는 장기이식 수술"
          description="전신마취 2시간 이상 또는 출혈·감염·호흡기 합병증 위험이 높은 수술"
          checked={specialCriteria.highRiskSurgeryOrTransplant}
          onPress={() =>
            setSpecialCriteria((current) => ({
              ...current,
              highRiskSurgeryOrTransplant: !current.highRiskSurgeryOrTransplant,
            }))
          }
        />
        <Text style={styles.inlineExample}>예: TLTG, PPPD, PrPD, AAA, colectomy, KT, LT</Text>
        <CheckCard
          title="65세 이상"
          description="입원일 기준 만 65세 이상"
          checked={specialCriteria.age65OrOlder}
          onPress={() => setSpecialCriteria((current) => ({ ...current, age65OrOlder: !current.age65OrOlder }))}
        />
      </SectionCard>

      <SectionCard title="응급상황 여부">
        <ToggleRow
          label="응급상황 발생 시"
          options={[
            { label: '아니오', value: false },
            { label: '예', value: true },
          ]}
          selected={emergency}
          onSelect={setEmergency}
        />
        {emergency ? (
          <Text style={styles.emergencyText}>응급상황은 기존 적용 기준과 관계없이 즉시 보고가 우선입니다.</Text>
        ) : null}
      </SectionCard>

      {news2Result && decision ? (
        <>
          <ResultCard
            title={mapResultTitle(decision.decision)}
            description={decision.description}
            news2Score={news2Result.totalScore}
            specialCriteriaCount={specialCriteriaCount}
            actionText={mapActionText(decision.decision)}
            reevaluationText={decision.nextReassessmentLabel}
            tone={mapResultTone(decision.decision)}
          />
          <AccordionCard title="재평가 및 중단 기준">
            <View style={styles.reassessmentList}>
              <Text style={styles.reassessmentText}>NEWS2 7점 이상: 매일 재평가</Text>
              <Text style={styles.reassessmentText}>NEWS2 5–6점: 수술 후 지정일 재평가, POD 2, POD 7, POD 14</Text>
              <Text style={styles.reassessmentText}>NEWS2 4점 미만 유지: HiCardi 중단 고려</Text>
              <Text style={styles.reassessmentText}>응급상황 발생 시: 기존 적용 기준과 관계없이 즉시 보고 및 적용 검토</Text>
            </View>
          </AccordionCard>
        </>
      ) : null}
    </ScrollView>
  );
}

function InputRow({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.inputRow}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        placeholder="숫자 입력"
        placeholderTextColor="#7B8A96"
        style={styles.input}
      />
    </View>
  );
}

function ToggleRow<T extends string | boolean>({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: { label: string; value: T }[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.toggleWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.toggleRow}>
        {options.map((option) => (
          <Pressable
            key={String(option.value)}
            style={[styles.toggleButton, selected === option.value && styles.toggleButtonActive]}
            onPress={() => onSelect(option.value)}
          >
            <Text style={[styles.toggleText, selected === option.value && styles.toggleTextActive]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function CheckCard({
  title,
  description,
  checked,
  onPress,
}: {
  title: string;
  description: string;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.checkCard, checked && styles.checkCardActive]} onPress={onPress}>
      <View style={[styles.checkBox, checked && styles.checkBoxActive]}>
        <Text style={styles.checkMark}>{checked ? '✓' : ''}</Text>
      </View>
      <View style={styles.checkTextBlock}>
        <Text style={styles.checkTitle}>{title}</Text>
        <Text style={styles.checkDescription}>{description}</Text>
      </View>
    </Pressable>
  );
}

function ScoreLine({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.scoreLine}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <Text style={styles.scoreValue}>{value}점</Text>
    </View>
  );
}

function getBandLabel(score: number) {
  if (score >= 7) return '7점 이상';
  if (score >= 5) return '5–6점';
  if (score >= 1) return '1–4점';
  return '4점 미만';
}

function mapResultTitle(decision: ReturnType<typeof evaluateHicardiDecision>['decision']) {
  if (decision === 'startHicardi') return 'HiCardi 적용 권장';
  if (decision === 'recommendHicardi') return 'HiCardi 적용 권고';
  if (decision === 'consultSenior') return '상급자와 협의';
  if (decision === 'considerStop') return 'HiCardi 중단 고려';
  if (decision === 'emergencyApply') return '즉시 보고 및 HiCardi 적용 검토';
  return '일반 관찰 유지';
}

function mapActionText(decision: ReturnType<typeof evaluateHicardiDecision>['decision']) {
  if (decision === 'startHicardi') return '담당 진료과 보고 및 HiCardi 적용 검토';
  if (decision === 'recommendHicardi') return '상급자 또는 담당 진료과 보고 후 적용 결정';
  if (decision === 'consultSenior') return 'HiCardi 적용 여부를 상급자와 협의';
  if (decision === 'considerStop') return '이미 적용 중인 경우 중단 여부를 검토';
  if (decision === 'emergencyApply') return '즉시 보고 후 기존 기준과 관계없이 적용 검토';
  return '정기적 NEWS2 측정 및 환자 상태 모니터링 유지';
}

function mapResultTone(decision: ReturnType<typeof evaluateHicardiDecision>['decision']) {
  if (decision === 'startHicardi' || decision === 'emergencyApply') return 'danger' as const;
  if (decision === 'recommendHicardi' || decision === 'consultSenior') return 'amber' as const;
  if (decision === 'considerStop') return 'neutral' as const;
  return 'stable' as const;
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 96,
    gap: 12,
  },
  description: {
    color: '#52616B',
    fontSize: 14,
    lineHeight: 21,
  },
  noticeBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F2D3A2',
    backgroundColor: '#FFF8E8',
    padding: 12,
  },
  noticeText: {
    color: '#7A6131',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  inputRow: {
    gap: 8,
  },
  inputLabel: {
    color: '#1F2933',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6E2E8',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2933',
  },
  toggleWrap: {
    gap: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toggleButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#B8D3E5',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toggleButtonActive: {
    borderColor: '#1E5B8C',
    backgroundColor: '#EAF3F9',
  },
  toggleText: {
    color: '#1F2933',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  toggleTextActive: {
    color: '#1E5B8C',
  },
  news2Summary: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#B8D3E5',
    backgroundColor: '#F4FAFD',
    padding: 16,
    gap: 10,
  },
  news2Score: {
    color: '#1E5B8C',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
  },
  scoreBand: {
    color: '#1F2933',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  scoreGrid: {
    gap: 8,
  },
  scoreLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  scoreLabel: {
    flex: 1,
    color: '#52616B',
    fontSize: 14,
    lineHeight: 20,
  },
  scoreValue: {
    color: '#1F2933',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  helperText: {
    color: '#52616B',
    fontSize: 12,
    lineHeight: 18,
  },
  checkCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D6E2E8',
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  checkCardActive: {
    borderColor: '#2BAE9E',
    backgroundColor: '#E9F8F6',
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#8AA3B5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxActive: {
    borderColor: '#2BAE9E',
    backgroundColor: '#2BAE9E',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  checkTextBlock: {
    flex: 1,
    gap: 4,
  },
  checkTitle: {
    color: '#1F2933',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  checkDescription: {
    color: '#52616B',
    fontSize: 12,
    lineHeight: 18,
  },
  inlineExample: {
    color: '#52616B',
    fontSize: 12,
    lineHeight: 18,
  },
  emergencyText: {
    color: '#B42318',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  reassessmentList: {
    gap: 8,
  },
  reassessmentText: {
    color: '#1F2933',
    fontSize: 14,
    lineHeight: 20,
  },
});
