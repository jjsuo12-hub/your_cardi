import React, { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Line, Path, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { useFonts } from 'expo-font';

import { DemoAnomalyToggle } from './components/DemoAnomalyToggle';
import { PatientVitalsScreen } from './screens/PatientVitalsScreen';
import { VitalSignsHistoryChart } from './components/VitalSignsHistoryChart';
import {
  DemoAnomalyType,
  generateAnomalyPatientVitals,
  generateNormalPatientVitals,
  pickRandomAnomalyType,
  pickRandomPatients,
} from './utils/generateDemoPatientVitals';

type Tab = 'criteria' | 'patients' | 'setup' | 'manual' | 'qa';
type DepartmentCategory =
  | 'transplantVascularSurgery'
  | 'colorectalSurgery'
  | 'pediatricSurgery'
  | 'hepatobiliaryPancreaticSurgery'
  | 'gastrointestinalSurgery'
  | 'endocrineSurgery'
  | 'icuTransferOther';
type TransplantSubtype = 'liver' | 'kidney';
type TransferSource = 'ward' | 'operatingRoom' | 'icu' | 'otherDepartmentIcu' | 'other';
type PatientStatus = 'stable' | 'caution' | 'checkRequired';
type SignalQuality = 'good' | 'weak' | 'poor';
type HicardiIndication = 'icuTransfer' | 'kidneyTransplant' | 'liverTransplant';
type VitalMetricName = 'HR' | 'SpO2' | 'RR' | 'SkinTemp';
type PatientTargets = {
  hrMin: number;
  hrMax: number;
  spo2Min: number;
  spo2Max: number;
  rrMin: number;
  rrMax: number;
  skinTempMin: number;
  skinTempMax: number;
};

type PatientAlertState = {
  patientId: string;
  hasAnomaly: boolean;
  anomalyMetrics: VitalMetricName[];
  isAcknowledged: boolean;
  acknowledgedAt?: number;
  suppressAlertUntil?: number;
};

type Patient = {
  id: string;
  name: string;
  patientNumber?: string;
  indication?: HicardiIndication;
  departmentCategory: DepartmentCategory;
  transplantSubtype?: TransplantSubtype;
  transferSource?: TransferSource;
  applicationReason?: string;
  memo?: string;
  targets: PatientTargets;
  room: string;
  bed?: string;
  pod?: number;
  hicardiStartTime?: string;
  status: PatientStatus;
  latestAlert?: string;
  battery: number;
  isDemoData: true;
};

type VitalSign = {
  patientId: string;
  hr: number;
  rr: number;
  spo2: number;
  temperature: number;
  signalQuality: SignalQuality;
  ekgWaveform: number[];
  hrTrend: number[];
  rrTrend: number[];
  spo2Trend: number[];
  temperatureTrend: number[];
  isDemoData: true;
};

const theme = {
  primary: '#1E5B8C',
  secondary: '#2BAE9E',
  background: '#F4F8FA',
  card: '#FFFFFF',
  text: '#1F2933',
  muted: '#52616B',
  border: '#D6E2E8',
  stable: '#2EAD6B',
  caution: '#F5A623',
  danger: '#D64545',
  primarySoft: '#EAF3F9',
  secondarySoft: '#E9F8F6',
  warningSoft: '#FFF6E5',
};

const temporaryNotice =
  '본 체크리스트와 매뉴얼 내용은 현재 임시안입니다. 실제 임상 적용 전 병동 프로토콜, 제조사 지침, 의료진 검토를 통해 수정·확정되어야 합니다.';

const demoNotice =
  'DEMO DATA: 본 화면은 실제 HiCardi 연동 화면이 아니며, 시연을 위한 가상 환자 생체정보입니다. 실제 환자 데이터 아님 / 실제 의료 판단용 아님.';

const departmentCategoryLabels: Record<DepartmentCategory, string> = {
  transplantVascularSurgery: '이식혈관외과',
  colorectalSurgery: '대장항문외과',
  pediatricSurgery: '소아외과',
  hepatobiliaryPancreaticSurgery: '간담췌외과',
  gastrointestinalSurgery: '위장관 외과',
  endocrineSurgery: '내분비 외과',
  icuTransferOther: '기타 / 타과 중환자실 전동',
};

const alertMetricNames: VitalMetricName[] = ['HR', 'SpO2'];

const transplantSubtypeLabels: Record<TransplantSubtype, string> = {
  liver: '간이식',
  kidney: '신장이식',
};

const transferSourceLabels: Record<TransferSource, string> = {
  ward: '병동 입원',
  operatingRoom: '수술실',
  icu: '중환자실',
  otherDepartmentIcu: '타과 중환자실',
  other: '기타',
};

const customFontAssets = {};
const appFontFamily =
  Platform.OS === 'web'
    ? 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    : Platform.OS === 'ios'
      ? 'System'
      : 'sans-serif';

function applyDefaultTypography() {
  const defaultStyle = { fontFamily: appFontFamily, letterSpacing: 0 };
  const textComponent = Text as unknown as { defaultProps?: { style?: unknown } };
  const inputComponent = TextInput as unknown as { defaultProps?: { style?: unknown } };
  textComponent.defaultProps = textComponent.defaultProps ?? {};
  inputComponent.defaultProps = inputComponent.defaultProps ?? {};
  textComponent.defaultProps.style = [defaultStyle, textComponent.defaultProps.style];
  inputComponent.defaultProps.style = [defaultStyle, inputComponent.defaultProps.style];
}

applyDefaultTypography();

const defaultTargets: PatientTargets = {
  hrMin: 60,
  hrMax: 100,
  spo2Min: 95,
  spo2Max: 100,
  rrMin: 12,
  rrMax: 20,
  skinTempMin: 35.8,
  skinTempMax: 37.4,
};

const statusLabels: Record<PatientStatus, string> = {
  stable: 'Stable demo',
  caution: 'Watch demo',
  checkRequired: 'Alert demo',
};

const signalLabels: Record<SignalQuality, string> = {
  good: '양호',
  weak: '약함',
  poor: '신호 확인 필요',
};

const checklistItems = [
  ['fever', '발열 또는 오한이 있음', 2, '감염 가능성 관찰이 필요한 상황을 가정한 임시 문항입니다.'],
  ['dyspnea', '호흡곤란 또는 산소 요구량 증가', 2, '호흡 상태 변화 관찰 필요성을 가정한 임시 문항입니다.'],
  ['arrhythmia', '심박수 이상 또는 부정맥 의심', 2, 'HR/EKG 관찰 필요성을 가정한 임시 문항입니다.'],
  ['bleeding', '출혈 또는 혈성 배액 의심', 2, '수술 후 상태 변화 확인을 위한 임시 문항입니다.'],
  ['infectionRisk', '면역억제 치료로 감염 위험이 높음', 1, '이식 환자의 감염 위험 관찰을 가정한 임시 문항입니다.'],
  ['handoff', '신규 간호사 인계 또는 집중 관찰 필요', 1, '운영 프로세스 표준화를 보여주기 위한 임시 문항입니다.'],
] as const;

const setupSteps = [
  '환자 확인',
  '환자등록 정보 확인',
  '피부 상태 확인',
  '기기 번호 확인',
  '기기 배터리 확인',
  '패치 부착',
  '환자-기기 매칭',
  'EKG / HR / RR 표시 확인',
  '알람 상태 확인',
  '적용 시작 시간 기록',
];

const manualItems = [
  '환자 등록 방법',
  '기기 연결 확인 방법',
  'EKG 신호 확인 방법',
  '알람 확인 방법',
  '배터리 확인 방법',
  '패치 재부착 또는 교체 시 확인사항',
  '적용 종료 및 기기 회수 방법',
  '인계 시 확인할 내용',
];

const qaItems = [
  'EKG 신호가 보이지 않아요',
  'HR 값이 평소와 다르게 보여요',
  'RR 값이 표시되지 않아요',
  '알람이 계속 떠요',
  '환자 목록에 나타나지 않아요',
  '기기 배터리가 부족해요',
  '패치가 떨어졌어요',
  '연결이 끊어졌어요',
  '적용 종료는 어떻게 하나요?',
];

const initialPatients: Patient[] = [
  {
    id: 'p1',
    name: '김OO',
    patientNumber: 'P-240601',
    indication: 'kidneyTransplant',
    departmentCategory: 'transplantVascularSurgery',
    transplantSubtype: 'kidney',
    transferSource: 'operatingRoom',
    applicationReason: '신장이식 후 시연용 관찰',
    memo: '시연용 가상 환자',
    targets: { ...defaultTargets },
    room: '601',
    bed: '1',
    pod: 2,
    hicardiStartTime: '오늘 08:20',
    status: 'stable',
    latestAlert: 'Stable demo',
    battery: 84,
    isDemoData: true,
  },
  {
    id: 'p2',
    name: '이OO',
    patientNumber: 'P-240602',
    indication: 'liverTransplant',
    departmentCategory: 'transplantVascularSurgery',
    transplantSubtype: 'liver',
    transferSource: 'operatingRoom',
    applicationReason: '간이식 후 시연용 관찰',
    memo: '시연용 가상 환자',
    targets: { ...defaultTargets, hrMax: 110, spo2Min: 94 },
    room: '602',
    bed: '2',
    pod: 1,
    hicardiStartTime: '오늘 10:05',
    status: 'stable',
    latestAlert: 'Stable demo',
    battery: 56,
    isDemoData: true,
  },
  {
    id: 'p3',
    name: '박OO',
    patientNumber: 'P-240603',
    indication: 'icuTransfer',
    departmentCategory: 'icuTransferOther',
    transferSource: 'icu',
    applicationReason: '중환자실 이송 후 시연용 관찰',
    memo: '시연용 가상 환자',
    targets: { ...defaultTargets, hrMax: 120 },
    room: '603',
    bed: '1',
    pod: 4,
    hicardiStartTime: '어제 21:40',
    status: 'stable',
    latestAlert: 'Stable demo',
    battery: 78,
    isDemoData: true,
  },
];

const initialVitals: Record<string, VitalSign> = {
  p1: createVital('p1', 78, 18, 98, 36.8, 'good'),
  p2: createVital('p2', 88, 17, 98, 36.4, 'good'),
  p3: createVital('p3', 84, 18, 97, 36.5, 'good'),
};

const demoPatientTemplates = [
  { name: '김OO', patientNumber: 'P-240601', indication: 'kidneyTransplant' as HicardiIndication, departmentCategory: 'transplantVascularSurgery' as DepartmentCategory, transplantSubtype: 'kidney' as TransplantSubtype, transferSource: 'operatingRoom' as TransferSource, applicationReason: '신장이식 후 시연용 관찰', targets: { ...defaultTargets }, room: '601', bed: '1', pod: 2 },
  { name: '이OO', patientNumber: 'P-240602', indication: 'liverTransplant' as HicardiIndication, departmentCategory: 'transplantVascularSurgery' as DepartmentCategory, transplantSubtype: 'liver' as TransplantSubtype, transferSource: 'operatingRoom' as TransferSource, applicationReason: '간이식 후 시연용 관찰', targets: { ...defaultTargets, hrMax: 110, spo2Min: 94 }, room: '602', bed: '2', pod: 1 },
  { name: '박OO', patientNumber: 'P-240603', indication: 'icuTransfer' as HicardiIndication, departmentCategory: 'icuTransferOther' as DepartmentCategory, transferSource: 'icu' as TransferSource, applicationReason: '중환자실 이송 후 시연용 관찰', targets: { ...defaultTargets, hrMax: 120 }, room: '603', bed: '1', pod: 4 },
  { name: '최OO', patientNumber: 'P-240604', indication: 'icuTransfer' as HicardiIndication, departmentCategory: 'gastrointestinalSurgery' as DepartmentCategory, transferSource: 'ward' as TransferSource, applicationReason: '위장관 외과 수술 후 시연용 관찰', targets: { ...defaultTargets }, room: '604', bed: '2', pod: 3 },
  { name: '정OO', patientNumber: 'P-240605', indication: 'icuTransfer' as HicardiIndication, departmentCategory: 'hepatobiliaryPancreaticSurgery' as DepartmentCategory, transferSource: 'operatingRoom' as TransferSource, applicationReason: '간담췌외과 수술 후 시연용 관찰', targets: { ...defaultTargets, spo2Min: 94 }, room: '605', bed: '1', pod: 5 },
];

export default function App() {
  const [fontsLoaded] = useFonts(customFontAssets);
  const [tab, setTab] = useState<Tab>('patients');
  const [patients, setPatients] = useState(initialPatients);
  const [selectedPatientId, setSelectedPatientId] = useState('p1');
  const [vitals, setVitals] = useState(initialVitals);
  const [isDemoAnomalyMode, setIsDemoAnomalyMode] = useState(false);
  const [anomalyTypes, setAnomalyTypes] = useState<Record<string, DemoAnomalyType>>({});
  const [patientAlertStates, setPatientAlertStates] = useState<Record<string, PatientAlertState>>({});
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>('p1');
  const [blinkOn, setBlinkOn] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [setupDone, setSetupDone] = useState<string[]>([]);
  const [manualSearch, setManualSearch] = useState('');
  const [manualSearchHistory, setManualSearchHistory] = useState<string[]>([]);
  const [qaSearch, setQaSearch] = useState('');
  const [manualDetail, setManualDetail] = useState<string | null>(null);
  const [qaDetail, setQaDetail] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>(['배터리 확인 방법']);
  const [patientForm, setPatientForm] = useState({
    name: 'OOO',
    tempId: 'DEMO-001',
    room: '601',
    bed: '1',
    departmentCategory: 'transplantVascularSurgery' as DepartmentCategory,
    transplantSubtype: 'kidney' as TransplantSubtype,
    transferSource: 'operatingRoom' as TransferSource,
    pod: '1',
    applicationReason: '시연용 적용 사유',
    memo: '시연용 가상 환자 메모',
    targets: { ...defaultTargets },
  });
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [applicator, setApplicator] = useState('RN');

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => setReduceMotion(false));
    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);
    return () => subscription?.remove?.();
  }, []);

  useEffect(() => {
    const hasUnacknowledgedAnomaly =
      isDemoAnomalyMode &&
      Object.values(vitals).some((vital) => {
        const patient = patients.find((item) => item.id === vital.patientId);
        const anomalyMetrics = getAlertMetrics(vital, patient?.targets);
        const alertState = patientAlertStates[vital.patientId];
        const shouldShowBlinkingAlert =
          anomalyMetrics.length > 0 && (!alertState?.suppressAlertUntil || Date.now() > alertState.suppressAlertUntil);
        return shouldShowBlinkingAlert;
      });

    if (!hasUnacknowledgedAnomaly || reduceMotion) {
      setBlinkOn(true);
      return undefined;
    }

    const timer = setInterval(() => setBlinkOn((current) => !current), 1000);
    return () => clearInterval(timer);
  }, [isDemoAnomalyMode, patientAlertStates, patients, reduceMotion, vitals]);

  useEffect(() => {
    const timer = setInterval(() => {
      setVitals((current) =>
        Object.fromEntries(
          Object.values(current).map((vital) => [vital.patientId, updateCurrentVital(vital, anomalyTypes[vital.patientId])]),
        ),
      );
    }, 1500);
    return () => clearInterval(timer);
  }, [anomalyTypes]);

  useEffect(() => {
    const timer = setInterval(() => {
      setVitals((current) =>
        Object.fromEntries(Object.values(current).map((vital) => [vital.patientId, appendFiveMinuteVitalRecord(vital)])),
      );
    }, 300000);
    return () => clearInterval(timer);
  }, []);

  const totalScore = useMemo(
    () => checklistItems.filter(([id]) => checkedItems.includes(id)).reduce((sum, item) => sum + item[2], 0),
    [checkedItems],
  );
  const decision = getDecision(totalScore);
  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId) ?? patients[0];

  const saveManualSearch = (value: string) => {
    const normalized = value.trim();
    if (!normalized) return;
    setManualSearchHistory((current) => [normalized, ...current.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 5));
  };

  const addSetupPatient = () => {
    if (setupDone.length !== setupSteps.length) return;
    const id = `demo-${Date.now()}`;
    const newPatient: Patient = {
      id,
      name: patientForm.name || '가상 환자',
      patientNumber: patientForm.tempId || `DEMO-${Date.now()}`,
      indication: getIndicationFromPatient(patientForm.departmentCategory, patientForm.transplantSubtype),
      departmentCategory: patientForm.departmentCategory,
      transplantSubtype: getTransplantSubtypeForSave(patientForm.departmentCategory, patientForm.transplantSubtype),
      transferSource: patientForm.transferSource,
      applicationReason: patientForm.applicationReason,
      memo: patientForm.memo,
      targets: patientForm.targets,
      room: patientForm.room || '000',
      bed: patientForm.bed || '0',
      pod: Number(patientForm.pod) || 0,
      hicardiStartTime: new Date().toLocaleString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: 'stable',
      latestAlert: `세팅 완료: ${applicator || '적용자 미입력'} / 시연용 더미 데이터`,
      battery: 92,
      isDemoData: true,
    };
    setPatients((current) => [newPatient, ...current]);
    setVitals((current) => ({ ...current, [id]: createVital(id, 82, 18, 98, 36.7, 'good') }));
    setSelectedPatientId(id);
    setTab('patients');
  };

  const generateDemoData = () => {
    const statuses: PatientStatus[] = ['stable', 'stable', 'stable', 'stable', 'stable'];
    const demoPatients = demoPatientTemplates.map((template, index) => {
      const id = `demo-p${index + 1}-${Date.now()}`;
      const battery = clamp(Math.round(92 - index * 16 + randomStep(8)), 12, 98);
      const latestAlert =
        statuses[index] === 'stable' ? '최근 알람 없음' : statuses[index] === 'caution' ? 'HR/RR 변화 관찰' : '신호 또는 산소포화도 확인';
      return {
        ...template,
        id,
        hicardiStartTime: `오늘 ${String(8 + index).padStart(2, '0')}:${index % 2 === 0 ? '20' : '45'}`,
        status: statuses[index],
        latestAlert: 'Stable demo',
        battery,
        isDemoData: true as const,
      };
    });
    const demoVitals = Object.fromEntries(
      demoPatients.map((patient, index) => {
        const status = patient.status;
        const hr = status === 'checkRequired' ? 124 : status === 'caution' ? 108 : 78 + index * 2;
        const rr = status === 'checkRequired' ? 27 : status === 'caution' ? 24 : 18;
        const spo2 = status === 'checkRequired' ? 93 : status === 'caution' ? 95 : 98;
        const signalQuality: SignalQuality = status === 'checkRequired' ? 'poor' : status === 'caution' ? 'weak' : 'good';
        return [patient.id, createVital(patient.id, hr, rr, spo2, 36.7 + index * 0.2, signalQuality)];
      }),
    );
    setPatients(demoPatients);
    setVitals(demoVitals);
    setIsDemoAnomalyMode(false);
    setAnomalyTypes({});
    setPatientAlertStates({});
    setSelectedPatientId(demoPatients[0].id);
    setExpandedPatientId(demoPatients[0].id);
    setTab('patients');
  };

  const resetToNormalDemoData = () => {
    setPatients((current) =>
      current.map((patient) => ({
        ...patient,
        status: 'stable',
        latestAlert: 'Stable demo',
      })),
    );
    setVitals((current) =>
      Object.fromEntries(
        Object.values(current).map((vital) => {
          const normal = generateNormalPatientVitals();
          return [vital.patientId, createVital(vital.patientId, normal.hr, normal.rr, normal.spo2, normal.skinTemperature, normal.signalQuality)];
        }),
      ),
    );
  };

  const toggleDemoAnomalyMode = (enabled: boolean) => {
    setIsDemoAnomalyMode(enabled);
    if (!enabled) {
      setAnomalyTypes({});
      setPatientAlertStates({});
      resetToNormalDemoData();
      return;
    }

    const selected = pickRandomPatients(patients, 2);
    const nextAnomalyTypes = Object.fromEntries(selected.map((patient) => [patient.id, pickRandomAnomalyType()]));
    setAnomalyTypes(nextAnomalyTypes);
    setPatientAlertStates({});
    setPatients((current) =>
      current.map((patient) => {
        const anomalyType = nextAnomalyTypes[patient.id];
        if (!anomalyType) return { ...patient, status: 'stable', latestAlert: 'Stable demo' };
        const anomaly = generateAnomalyPatientVitals(anomalyType);
        return { ...patient, status: anomaly.status, latestAlert: anomaly.latestAlert };
      }),
    );
    setVitals((current) =>
      Object.fromEntries(
        Object.values(current).map((vital) => {
          const anomalyType = nextAnomalyTypes[vital.patientId];
          const demo = anomalyType ? generateAnomalyPatientVitals(anomalyType) : generateNormalPatientVitals();
          return [vital.patientId, createVital(vital.patientId, demo.hr, demo.rr, demo.spo2, demo.skinTemperature, demo.signalQuality)];
        }),
      ),
    );
  };

  const resetPatientForm = () => {
    setPatientForm({
      name: '',
      tempId: `DEMO-${Date.now()}`,
      room: '',
      bed: '',
      departmentCategory: 'transplantVascularSurgery',
      transplantSubtype: 'kidney',
      transferSource: 'ward',
      pod: '',
      applicationReason: '',
      memo: '',
      targets: { ...defaultTargets },
    });
    setEditingPatientId(null);
  };

  const acknowledgePatientAnomaly = (patientId: string) => {
    const now = Date.now();
    const patient = patients.find((item) => item.id === patientId);
    const vital = vitals[patientId];
    setPatientAlertStates((current) => ({
      ...current,
      [patientId]: {
        patientId,
        hasAnomaly: Boolean(vital && getAlertMetrics(vital, patient?.targets).length > 0),
        anomalyMetrics: vital ? getAlertMetrics(vital, patient?.targets) : [],
        isAcknowledged: true,
        acknowledgedAt: now,
        suppressAlertUntil: now + 10 * 60 * 1000,
      },
    }));
  };

  const selectPatientForEdit = (patient: Patient) => {
    setEditingPatientId(patient.id);
    setPatientForm({
      name: patient.name,
      tempId: patient.patientNumber ?? patient.id,
      room: patient.room,
      bed: patient.bed ?? '',
      departmentCategory: patient.departmentCategory,
      transplantSubtype: patient.transplantSubtype ?? 'kidney',
      transferSource: patient.transferSource ?? 'ward',
      pod: patient.pod === undefined ? '' : `${patient.pod}`,
      applicationReason: patient.applicationReason ?? '',
      memo: patient.memo ?? '',
      targets: { ...(patient.targets ?? defaultTargets) },
    });
  };

  const savePatientRegistration = () => {
    const targets = normalizeTargets(patientForm.targets);
    if (editingPatientId) {
      setPatients((current) =>
        current.map((patient) =>
          patient.id === editingPatientId
            ? {
                ...patient,
                name: patientForm.name || '가상 환자',
                patientNumber: patientForm.tempId || patient.patientNumber,
                indication: getIndicationFromPatient(patientForm.departmentCategory, patientForm.transplantSubtype),
                departmentCategory: patientForm.departmentCategory,
                transplantSubtype: getTransplantSubtypeForSave(patientForm.departmentCategory, patientForm.transplantSubtype),
                transferSource: patientForm.transferSource,
                applicationReason: patientForm.applicationReason,
                memo: patientForm.memo,
                room: patientForm.room || '000',
                bed: patientForm.bed,
                pod: Number(patientForm.pod) || 0,
                targets,
              }
            : patient,
        ),
      );
      resetPatientForm();
      return;
    }

    const id = `patient-${Date.now()}`;
    const newPatient: Patient = {
      id,
      name: patientForm.name || '가상 환자',
      patientNumber: patientForm.tempId || `DEMO-${Date.now()}`,
      indication: getIndicationFromPatient(patientForm.departmentCategory, patientForm.transplantSubtype),
      departmentCategory: patientForm.departmentCategory,
      transplantSubtype: getTransplantSubtypeForSave(patientForm.departmentCategory, patientForm.transplantSubtype),
      transferSource: patientForm.transferSource,
      applicationReason: patientForm.applicationReason,
      memo: patientForm.memo,
      targets,
      room: patientForm.room || '000',
      bed: patientForm.bed,
      pod: Number(patientForm.pod) || 0,
      hicardiStartTime: new Date().toLocaleString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: 'stable',
      latestAlert: 'Stable demo',
      battery: 90,
      isDemoData: true,
    };
    setPatients((current) => [newPatient, ...current]);
    setVitals((current) => ({ ...current, [id]: createVital(id, 82, 18, 98, 36.7, 'good') }));
    setSelectedPatientId(id);
    setExpandedPatientId(id);
    resetPatientForm();
  };

  const toggleExpandedPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    setExpandedPatientId((current) => (current === patientId ? null : patientId));
  };

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.appShell}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>YOUR_Cardi:</Text>
          <Text style={styles.headerSubtitle}>HiCardi 적용 판단과 모니터링 보조 병동 간호 지원 어플리케이션</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          {tab === 'criteria' && (
            <CriteriaScreen
              checkedItems={checkedItems}
              setCheckedItems={setCheckedItems}
              totalScore={totalScore}
              decision={decision}
              patientForm={patientForm}
              setPatientForm={setPatientForm}
              patients={patients}
              editingPatientId={editingPatientId}
              savePatientRegistration={savePatientRegistration}
              selectPatientForEdit={selectPatientForEdit}
              cancelPatientEdit={resetPatientForm}
              goSetup={() => setTab('setup')}
            />
          )}
          {tab === 'patients' && (
            <PatientsScreen
              patients={patients}
              selectedPatient={selectedPatient}
              selectedVital={vitals[selectedPatient.id]}
              vitals={vitals}
              expandedPatientId={expandedPatientId}
              toggleExpandedPatient={toggleExpandedPatient}
              isDemoAnomalyMode={isDemoAnomalyMode}
              toggleDemoAnomalyMode={toggleDemoAnomalyMode}
              patientAlertStates={patientAlertStates}
              acknowledgePatientAnomaly={acknowledgePatientAnomaly}
              blinkOn={blinkOn}
              reduceMotion={reduceMotion}
            />
          )}
          {tab === 'setup' && (
            <SetupScreen
              setupDone={setupDone}
              setSetupDone={setSetupDone}
              patientForm={patientForm}
              setPatientForm={setPatientForm}
              applicator={applicator}
              setApplicator={setApplicator}
              addSetupPatient={addSetupPatient}
            />
          )}
          {tab === 'manual' && (
            <ManualScreen
              search={manualSearch}
              setSearch={setManualSearch}
              saveSearch={saveManualSearch}
              searchHistory={manualSearchHistory}
              detail={manualDetail}
              setDetail={setManualDetail}
              favorites={favorites}
              setFavorites={setFavorites}
            />
          )}
          {tab === 'qa' && <QaScreen search={qaSearch} setSearch={setQaSearch} detail={qaDetail} setDetail={setQaDetail} />}
        </ScrollView>
        <BottomTabs active={tab} setActive={setTab} />
      </View>
    </SafeAreaView>
  );
}

function CriteriaScreen({
  checkedItems,
  setCheckedItems,
  totalScore,
  decision,
  patientForm,
  setPatientForm,
  patients,
  editingPatientId,
  savePatientRegistration,
  selectPatientForEdit,
  cancelPatientEdit,
  goSetup,
}: {
  checkedItems: string[];
  setCheckedItems: React.Dispatch<React.SetStateAction<string[]>>;
  totalScore: number;
  decision: ReturnType<typeof getDecision>;
  patientForm: {
    name: string;
    tempId: string;
    room: string;
    bed: string;
    departmentCategory: DepartmentCategory;
    transplantSubtype: TransplantSubtype;
    transferSource: TransferSource;
    pod: string;
    applicationReason: string;
    memo: string;
    targets: PatientTargets;
  };
  setPatientForm: React.Dispatch<React.SetStateAction<CriteriaScreenProps['patientForm']>>;
  patients: Patient[];
  editingPatientId: string | null;
  savePatientRegistration: () => void;
  selectPatientForEdit: (patient: Patient) => void;
  cancelPatientEdit: () => void;
  goSetup: () => void;
}) {
  const checkedLabels = checklistItems.filter(([id]) => checkedItems.includes(id)).map(([, label]) => label);
  const isTransplantVascularSurgery = patientForm.departmentCategory === 'transplantVascularSurgery';
  const summary = `${patientForm.name || 'OOO'} 환자는 현재 HiCardi 체크리스트 임시 점수 ${totalScore}점으로, ${decision.title} 범위에 해당합니다. 체크된 주요 사유는 ${
    checkedLabels.length ? checkedLabels.join(', ') : '없음'
  }입니다. 단, 본 결과는 임시 기준에 따른 것으로 실제 적용 여부는 병동 프로토콜과 의료진 판단에 따라 결정해야 합니다.`;

  return (
    <View style={styles.screen}>
      <Notice title="임시안 / 실제 의료 판단용 아님" text={temporaryNotice} tone="warning" />
      <Section title={editingPatientId ? '환자등록 수정' : '환자등록'}>
        <Text style={styles.helperText}>실제 개인정보 대신 이니셜 또는 발표용 임시 ID를 입력하세요.</Text>
        <View style={styles.twoCols}>
          <Field label="환자명" value={patientForm.name} onChangeText={(name) => setPatientForm((p) => ({ ...p, name }))} />
          <Field label="병실" value={patientForm.room} onChangeText={(room) => setPatientForm((p) => ({ ...p, room }))} />
          <Field label="침상" value={patientForm.bed} onChangeText={(bed) => setPatientForm((p) => ({ ...p, bed }))} />
          <Field label="POD" value={patientForm.pod} onChangeText={(pod) => setPatientForm((p) => ({ ...p, pod }))} keyboardType="numeric" />
        </View>
        <Text style={styles.label}>진료과/환자 대분류</Text>
        <Segmented
          value={patientForm.departmentCategory}
          options={Object.entries(departmentCategoryLabels).map(([value, label]) => ({ value, label }))}
          onChange={(departmentCategory) =>
            setPatientForm((p) => ({
              ...p,
              departmentCategory: departmentCategory as DepartmentCategory,
              transplantSubtype:
                departmentCategory === 'transplantVascularSurgery' ? p.transplantSubtype : 'kidney',
            }))
          }
        />
        {isTransplantVascularSurgery ? (
          <>
            <Text style={styles.label}>이식혈관외과 세부 항목</Text>
            <Segmented
              value={patientForm.transplantSubtype}
              options={Object.entries(transplantSubtypeLabels).map(([value, label]) => ({ value, label }))}
              onChange={(transplantSubtype) => setPatientForm((p) => ({ ...p, transplantSubtype: transplantSubtype as TransplantSubtype }))}
            />
          </>
        ) : (
          <Text style={styles.helperText}>이식혈관외과가 아닌 환자는 이식 세부 항목 없이 수술/질환 내용과 적용 사유를 아래에 기록하세요.</Text>
        )}
        <Text style={styles.label}>전동 출처</Text>
        <Segmented
          value={patientForm.transferSource}
          options={Object.entries(transferSourceLabels).map(([value, label]) => ({ value, label }))}
          onChange={(transferSource) => setPatientForm((p) => ({ ...p, transferSource: transferSource as TransferSource }))}
        />
        <Field label="적용 사유" value={patientForm.applicationReason} onChangeText={(applicationReason) => setPatientForm((p) => ({ ...p, applicationReason }))} multiline />
        <Field label="메모" value={patientForm.memo} onChangeText={(memo) => setPatientForm((p) => ({ ...p, memo }))} multiline />
        <PatientTargetFields targets={patientForm.targets} setTargets={(targets) => setPatientForm((p) => ({ ...p, targets }))} />
        <View style={styles.formButtonRow}>
          <Pressable style={styles.primaryButton} onPress={savePatientRegistration}>
            <Text style={styles.primaryButtonText}>{editingPatientId ? '수정 저장' : '환자 등록'}</Text>
          </Pressable>
          {editingPatientId && (
            <Pressable style={styles.secondaryButton} onPress={cancelPatientEdit}>
              <Text style={styles.secondaryButtonText}>취소</Text>
            </Pressable>
          )}
        </View>
      </Section>
      <Section title="등록된 환자 리스트">
        {patients.map((patient) => (
          <Pressable
            key={patient.id}
            style={[styles.patientCard, editingPatientId === patient.id && styles.patientCardActive]}
            onPress={() => selectPatientForEdit(patient)}
          >
            <Text style={styles.cardTitle}>
              {patient.name} · {patient.room}
              {patient.bed ? `-${patient.bed}` : ''}
            </Text>
            <Text style={styles.cardText}>
              {getPatientCategorySummary(patient)} · POD {patient.pod ?? '-'} · 전동 출처: {patient.transferSource ? transferSourceLabels[patient.transferSource] : '-'} · 시연용 더미 데이터
            </Text>
          </Pressable>
        ))}
      </Section>
      <Section title="적용 기준 체크리스트 - 추후 확정 예정">
        {checklistItems.map(([id, label, score, description]) => {
          const selected = checkedItems.includes(id);
          return (
            <Pressable
              key={id}
              style={[styles.checkCard, selected && styles.checkCardActive]}
              onPress={() =>
                setCheckedItems((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
              }
            >
              <View style={[styles.fakeCheck, selected && styles.fakeCheckActive]}>
                <Text style={styles.fakeCheckText}>{selected ? '✓' : ''}</Text>
              </View>
              <View style={styles.flex}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>{label}</Text>
                  <Text style={styles.score}>+{score}점</Text>
                </View>
                <Text style={styles.cardText}>{description}</Text>
                <Badge text="임시 문항 / 추후 확정 예정" />
              </View>
            </Pressable>
          );
        })}
      </Section>
      <Section title="임시 결과 판정">
        <View style={[styles.resultCard, { borderColor: decision.color }]}>
          <Text style={styles.resultScore}>{totalScore}점</Text>
          <Text style={[styles.resultTitle, { color: decision.color }]}>{decision.title} - 임시 기준</Text>
          <Text style={styles.cardText}>{decision.reason}</Text>
          <Badge text="임시 기준 / 추후 확정 예정 / 실제 의료 판단용 아님" />
        </View>
        <Text style={styles.summary}>{summary}</Text>
        <Pressable style={styles.primaryButton} onPress={goSetup}>
          <Text style={styles.primaryButtonText}>초기 세팅으로 이동</Text>
        </Pressable>
      </Section>
    </View>
  );
}

type CriteriaScreenProps = React.ComponentProps<typeof CriteriaScreen>;

function PatientsScreen({
  patients,
  selectedPatient,
  selectedVital,
  vitals,
  expandedPatientId,
  toggleExpandedPatient,
  isDemoAnomalyMode,
  toggleDemoAnomalyMode,
  patientAlertStates,
  acknowledgePatientAnomaly,
  blinkOn,
  reduceMotion,
}: {
  patients: Patient[];
  selectedPatient: Patient;
  selectedVital: VitalSign;
  vitals: Record<string, VitalSign>;
  expandedPatientId: string | null;
  toggleExpandedPatient: (id: string) => void;
  isDemoAnomalyMode: boolean;
  toggleDemoAnomalyMode: (enabled: boolean) => void;
  patientAlertStates: Record<string, PatientAlertState>;
  acknowledgePatientAnomaly: (patientId: string) => void;
  blinkOn: boolean;
  reduceMotion: boolean;
}) {
  const slots = Array.from({ length: 6 }, (_, index) => patients[index] ?? null);

  return (
    <View style={styles.screen}>
      <Notice title="DEMO DATA / 실제 환자 데이터 아님" text={demoNotice} tone="blue" />
      <DemoAnomalyToggle enabled={isDemoAnomalyMode} onToggle={toggleDemoAnomalyMode} />
      {isDemoAnomalyMode && (
        <View style={styles.anomalyModeBadge}>
          <Text style={styles.anomalyModeBadgeText}>DEMO ANOMALY MODE · 환자 상태를 확인하세요</Text>
        </View>
      )}
      <Section title="적용 환자 리스트">
        {slots.map((patient, index) => {
          const selected = patient?.id === expandedPatientId;
          const vital = patient ? vitals[patient.id] : undefined;
          const abnormalMetrics = vital ? getDemoAnomalyMetrics(vital, patient?.targets) : [];
          const alertMetrics = isDemoAnomalyMode && vital ? getAlertMetrics(vital, patient?.targets) : [];
          const hasAnomaly = Boolean(patient && alertMetrics.length > 0);
          const alertState = patient ? patientAlertStates[patient.id] : undefined;
          const isSuppressed = Boolean(alertState?.suppressAlertUntil && Date.now() <= alertState.suppressAlertUntil);
          const isAcknowledged = Boolean(alertState?.isAcknowledged && isSuppressed);
          const shouldShowBlinkingAlert = hasAnomaly && (!alertState?.suppressAlertUntil || Date.now() > alertState.suppressAlertUntil);
          const shouldBlink = shouldShowBlinkingAlert && !reduceMotion && blinkOn;

          return (
            <View
              key={patient?.id ?? `empty-${index}`}
              style={[
                styles.slotCard,
                selected && styles.slotCardActive,
                hasAnomaly && styles.slotCardAlertDemo,
                hasAnomaly && isAcknowledged && styles.slotCardAcknowledged,
                !patient && styles.emptySlotCard,
              ]}
            >
              <Pressable disabled={!patient} onPress={() => patient && toggleExpandedPatient(patient.id)}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.slotTitle, !patient && styles.emptySlotText]}>Slot {index + 1}</Text>
                  {hasAnomaly && (
                    <View style={styles.alertIcon}>
                      <Text style={styles.alertIconText}>!</Text>
                    </View>
                  )}
                </View>

                {patient ? (
                  <View style={styles.slotInfo}>
                    <View
                      style={[
                        styles.patientNameAlertArea,
                        hasAnomaly && styles.patientNameAlertAreaActive,
                        hasAnomaly && !isAcknowledged && shouldBlink && styles.patientNameAlertAreaBlink,
                        hasAnomaly && isAcknowledged && styles.patientNameAlertAreaAck,
                      ]}
                    >
                      <Text style={[styles.slotPatientName, hasAnomaly && shouldShowBlinkingAlert && styles.slotPatientNameAlert]}>{patient.name}</Text>
                      {hasAnomaly && (shouldShowBlinkingAlert || isAcknowledged) && (
                        <View style={[styles.inlineAlertBadge, isAcknowledged && styles.inlineAckBadge]}>
                          <Text style={[styles.inlineAlertBadgeText, isAcknowledged && styles.inlineAckBadgeText]}>
                            {isAcknowledged ? '확인 완료' : '환자 상태를 확인하세요'}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.slotMeta}>환자번호: {patient.patientNumber ?? patient.id}</Text>
                    <Text style={styles.slotMeta}>대분류: {getPatientCategorySummary(patient)}</Text>
                    <Text style={styles.slotMeta}>전동 출처: {patient.transferSource ? transferSourceLabels[patient.transferSource] : '-'}</Text>
                    <Text style={styles.slotMeta}>적용 사유: {patient.applicationReason || '시연용 등록'}</Text>
                    <Text style={styles.slotMeta}>
                      병실: {patient.room}{patient.bed ? `-${patient.bed}` : ''} · 상태: {hasAnomaly && isAcknowledged ? 'Acknowledged demo' : statusLabels[patient.status]}
                    </Text>
                    {hasAnomaly && shouldShowBlinkingAlert && (
                      <Text style={styles.anomalyMetricSummary}>데모 알림 항목: {alertMetrics.join(', ')}</Text>
                    )}
                    {!hasAnomaly && abnormalMetrics.length > 0 && (
                      <Text style={styles.referenceMetricSummary}>참고 이상 수치: {abnormalMetrics.join(', ')} · 경고 배지는 띄우지 않습니다.</Text>
                    )}
                  </View>
                ) : (
                  <View style={styles.emptySlotInner}>
                    <Text style={styles.emptySlotText}>비어 있음</Text>
                  </View>
                )}
              </Pressable>

              {patient && selected && vital && (
                <View style={styles.expandedVitalsPanel}>
                  <View style={styles.slideHandle} />
                  <Text style={styles.expandedTitle}>생체정보 상세</Text>
                  <Text style={styles.sectionCaption}>선택 환자: {patient.name} / 시연용 임시 기준으로 표시됩니다.</Text>
                  <View style={styles.metricGrid}>
                    <VitalMetricCard label="HR" value={`${vital.hr}`} unit="bpm" abnormal={abnormalMetrics.includes('HR')} acknowledged={isAcknowledged} blink={shouldBlink} showAlert={shouldShowBlinkingAlert && alertMetrics.includes('HR')} />
                    <VitalMetricCard label="SpO2" value={`${vital.spo2}`} unit="%" abnormal={abnormalMetrics.includes('SpO2')} acknowledged={isAcknowledged} blink={shouldBlink} showAlert={shouldShowBlinkingAlert && alertMetrics.includes('SpO2')} />
                    <VitalMetricCard label="RR" value={`${vital.rr}`} unit="breaths/min" abnormal={abnormalMetrics.includes('RR')} acknowledged={false} blink={false} showAlert={false} />
                    <VitalMetricCard label="SkinTemp" displayLabel="Skin Temp" value={vital.temperature.toFixed(1)} unit="°C" abnormal={abnormalMetrics.includes('SkinTemp')} acknowledged={false} blink={false} showAlert={false} />
                  </View>
                  {hasAnomaly && (shouldShowBlinkingAlert || isAcknowledged) && (
                    <View style={styles.acknowledgePanel}>
                      <Text style={styles.acknowledgeText}>
                        {isAcknowledged
                          ? '확인 완료 · 10분 동안 해당 환자의 데모 알림 깜빡임을 중지합니다.'
                          : '개발용 데모 기능입니다. 실제 환자 데이터가 아니며 임상 판단에 사용할 수 없습니다.'}
                      </Text>
                      {shouldShowBlinkingAlert && (
                        <Pressable style={styles.acknowledgeButton} onPress={() => acknowledgePatientAnomaly(patient.id)}>
                          <Text style={styles.acknowledgeButtonText}>확인했습니다</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                  <Notice
                    title="시연용 임시 상태 로직"
                    text="생체정보 기록은 5분마다 실시하는 것으로 가정합니다. HR, SpO2는 환자등록 화면의 환자별 Target 값을 우선 사용하고, RR·Skin Temp는 참고용 이상 표시만 남깁니다. 실제 임상 기준이 아닙니다."
                    tone="warning"
                  />
                  <View style={styles.targetSummary}>
                    <Text style={styles.targetSummaryText}>
                      알림 Target 예시: HR {patient.targets.hrMin}-{patient.targets.hrMax} bpm · SpO2 {patient.targets.spo2Min}-{patient.targets.spo2Max}% / RR, Skin Temp는 참고 수치만 빨간색으로 표시합니다.
                    </Text>
                  </View>
                  <VitalSignsHistoryChart />
                  <PatientVitalsScreen
                    patientName={patient.name}
                    roomBed={`${patient.room}${patient.bed ? `-${patient.bed}` : ''}`}
                    reason={patient.applicationReason || getPatientCategorySummary(patient)}
                  />
                </View>
              )}
            </View>
          );
        })}
      </Section>
    </View>
  );
}

function SetupScreen({
  setupDone,
  setSetupDone,
  patientForm,
  setPatientForm,
  applicator,
  setApplicator,
  addSetupPatient,
}: {
  setupDone: string[];
  setSetupDone: React.Dispatch<React.SetStateAction<string[]>>;
  patientForm: CriteriaScreenProps['patientForm'];
  setPatientForm: React.Dispatch<React.SetStateAction<CriteriaScreenProps['patientForm']>>;
  applicator: string;
  setApplicator: (value: string) => void;
  addSetupPatient: () => void;
}) {
  const complete = setupDone.length === setupSteps.length;
  return (
    <View style={styles.screen}>
      <Notice
        title="초기 세팅 안내 임시안"
        text="본 초기 세팅 안내는 임시안입니다. 실제 사용 시 제조사 지침과 병동 프로토콜을 우선 확인해야 합니다."
        tone="warning"
      />
      <Section title="세팅 대상">
        <View style={styles.twoCols}>
          <Field label="환자명 또는 이니셜" value={patientForm.name} onChangeText={(name) => setPatientForm((p) => ({ ...p, name }))} />
          <Field label="병실" value={patientForm.room} onChangeText={(room) => setPatientForm((p) => ({ ...p, room }))} />
          <Field label="침상" value={patientForm.bed} onChangeText={(bed) => setPatientForm((p) => ({ ...p, bed }))} />
          <Field label="적용자 이름 또는 이니셜" value={applicator} onChangeText={setApplicator} />
        </View>
      </Section>
      <Section title="Step-by-Step 가이드">
        {setupSteps.map((step, index) => {
          const selected = setupDone.includes(step);
          return (
            <Pressable
              key={step}
              style={[styles.stepRow, selected && styles.stepRowDone]}
              onPress={() =>
                setSetupDone((current) => (current.includes(step) ? current.filter((item) => item !== step) : [...current, step]))
              }
            >
              <View style={[styles.fakeCheck, selected && styles.fakeCheckActive]}>
                <Text style={styles.fakeCheckText}>{selected ? '✓' : ''}</Text>
              </View>
              <Text style={styles.stepText}>
                {index + 1}. {step}
              </Text>
              <Badge text="임시안" compact />
            </Pressable>
          );
        })}
        <Pressable style={[styles.primaryButton, !complete && styles.disabledButton]} onPress={addSetupPatient} disabled={!complete}>
          <Text style={styles.primaryButtonText}>{complete ? '세팅 완료 및 적용 환자 현황에 추가' : '모든 필수 항목 체크 후 활성화'}</Text>
        </Pressable>
      </Section>
    </View>
  );
}

function PatientTargetFields({
  targets,
  setTargets,
}: {
  targets: PatientTargets;
  setTargets: (targets: PatientTargets) => void;
}) {
  const updateNumber = (key: keyof PatientTargets, value: string) => {
    const numeric = Number(value.replace(/[^0-9.]/g, ''));
    setTargets({ ...targets, [key]: Number.isFinite(numeric) ? numeric : 0 });
  };

  return (
    <View style={styles.targetCard}>
      <View style={styles.rowBetween}>
        <Text style={styles.targetTitle}>환자별 Target 설정</Text>
        <Badge text="시연용 설정" compact />
      </View>
      <Text style={styles.targetCaption}>Target 값은 프로토타입 시연용 설정입니다. 실제 임상 기준으로 사용하지 마세요.</Text>
      <View style={styles.targetGrid}>
        <Field label="HR min (bpm)" value={`${targets.hrMin}`} onChangeText={(value) => updateNumber('hrMin', value)} keyboardType="numeric" />
        <Field label="HR max (bpm)" value={`${targets.hrMax}`} onChangeText={(value) => updateNumber('hrMax', value)} keyboardType="numeric" />
        <Field label="SpO2 min (%)" value={`${targets.spo2Min}`} onChangeText={(value) => updateNumber('spo2Min', value)} keyboardType="numeric" />
        <Field label="SpO2 max (%)" value={`${targets.spo2Max}`} onChangeText={(value) => updateNumber('spo2Max', value)} keyboardType="numeric" />
      </View>
      <Text style={styles.targetCaption}>RR, Skin Temperature는 신뢰성이 낮아 환자 상태 확인 알림 기준에서는 제외했습니다. 수치 카드와 그래프의 참고 표시는 유지됩니다.</Text>
    </View>
  );
}

function ManualScreen({
  search,
  setSearch,
  saveSearch,
  searchHistory,
  detail,
  setDetail,
  favorites,
  setFavorites,
}: {
  search: string;
  setSearch: (value: string) => void;
  saveSearch: (value: string) => void;
  searchHistory: string[];
  detail: string | null;
  setDetail: (value: string | null) => void;
  favorites: string[];
  setFavorites: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const items = manualItems
    .filter((item) => item.includes(search) || item.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => Number(favorites.includes(b)) - Number(favorites.includes(a)));
  return (
    <View style={styles.screen}>
      <Notice title="간단 매뉴얼 임시안" text={`${temporaryNotice} 제조사 지침과 병동 프로토콜을 우선 확인해야 합니다.`} tone="warning" />
      <Section title="매뉴얼 검색">
        <Field
          label="검색어"
          value={search}
          onChangeText={setSearch}
          onBlur={() => saveSearch(search)}
          placeholder="연결, 배터리, 알람, EKG, 패치, 종료"
        />
        {searchHistory.length > 0 && (
          <View style={styles.searchHistoryWrap}>
            <Text style={styles.searchHistoryLabel}>이전 검색어 5개</Text>
            <View style={styles.searchHistoryRow}>
              {searchHistory.map((item) => (
                <Pressable
                  key={item}
                  style={styles.searchHistoryChip}
                  onPress={() => {
                    setSearch(item);
                    saveSearch(item);
                  }}
                >
                  <Text style={styles.searchHistoryChipText}>{item}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </Section>
      {detail ? (
        <Section title="매뉴얼 상세">
          <Pressable style={styles.secondaryButton} onPress={() => setDetail(null)}>
            <Text style={styles.secondaryButtonText}>목록으로 돌아가기</Text>
          </Pressable>
          <Detail title={`${detail} - 임시안`} />
        </Section>
      ) : (
        <Section title="카드형 매뉴얼 목록">
          {items.map((item) => {
            const favorite = favorites.includes(item);
            return (
              <View key={item} style={styles.manualCard}>
                <Pressable
                  style={styles.flex}
                  onPress={() => {
                    saveSearch(search);
                    setDetail(item);
                  }}
                >
                  <Text style={styles.cardTitle}>{item}</Text>
                  <Text style={styles.cardText}>짧은 단계형 임시 안내를 확인합니다.</Text>
                  <Badge text="임시 매뉴얼 / 추후 확정 예정" />
                </Pressable>
                <Pressable
                  style={[styles.favoriteButton, favorite && styles.favoriteButtonActive]}
                  onPress={() => setFavorites((current) => (favorite ? current.filter((title) => title !== item) : [...current, item]))}
                >
                  <Text style={styles.favoriteText}>{favorite ? '★' : '☆'}</Text>
                </Pressable>
              </View>
            );
          })}
        </Section>
      )}
    </View>
  );
}

function QaScreen({
  search,
  setSearch,
  detail,
  setDetail,
}: {
  search: string;
  setSearch: (value: string) => void;
  detail: string | null;
  setDetail: (value: string | null) => void;
}) {
  const filtered = qaItems.filter((item) => item.includes(search) || item.toLowerCase().includes(search.toLowerCase()));
  return (
    <View style={styles.screen}>
      <Notice
        title="Q&A 임시 답변 / 추후 확정 예정"
        text="실제 대응은 제조사 지침과 병동 프로토콜을 따릅니다. 환자 상태 확인을 우선으로 하는 참고용 흐름입니다."
        tone="warning"
      />
      <Section title="Q&A 검색">
        <Field label="검색어" value={search} onChangeText={setSearch} placeholder="EKG, HR, RR, 알람, 배터리, 패치, 연결" />
      </Section>
      {detail ? (
        <Section title="문제 해결 순서">
          <Pressable style={styles.secondaryButton} onPress={() => setDetail(null)}>
            <Text style={styles.secondaryButtonText}>목록으로 돌아가기</Text>
          </Pressable>
          <Detail title={`문제 상황: ${detail}`} warning="※ 실제 대응은 제조사 지침과 병동 프로토콜을 따릅니다." />
        </Section>
      ) : (
        <Section title="증상 선택형 Q&A">
          {filtered.map((item) => (
            <Pressable key={item} style={styles.qaCard} onPress={() => setDetail(item)}>
              <Text style={styles.cardTitle}>{item}</Text>
              <Text style={styles.cardText}>환자 상태 확인 → 기기 상태 확인 → 관리자 문의 순서로 안내합니다.</Text>
              <Badge text="임시 Q&A / 추후 확정 예정" />
            </Pressable>
          ))}
        </Section>
      )}
    </View>
  );
}

function Detail({ title, warning }: { title: string; warning?: string }) {
  const steps = [
    '환자 상태를 먼저 확인합니다.',
    '패치 부착 상태와 기기 번호를 확인합니다.',
    '기기 연결 상태와 배터리 상태를 확인합니다.',
    '생체정보 표시 여부를 확인합니다.',
    '해결되지 않으면 담당자 또는 관리자에게 문의합니다.',
  ];
  return (
    <View style={styles.detailCard}>
      <Text style={styles.detailTitle}>{title}</Text>
      <Badge text="임시안 / 추후 확정 예정" />
      {steps.map((step, index) => (
        <Text key={step} style={styles.detailStep}>
          {index + 1}. {step}
        </Text>
      ))}
      <Text style={styles.warningText}>{warning ?? '※ 본 내용은 임시안이며 추후 병동 지침과 제조사 지침에 맞게 수정 예정입니다.'}</Text>
    </View>
  );
}

function TabIcon({ tab, active }: { tab: Tab; active: boolean }) {
  const color = active ? '#FFFFFF' : theme.primary;

  if (tab === 'criteria') {
    return (
      <Svg width="24" height="24" viewBox="0 0 24 24">
        <Rect x="5" y="4" width="14" height="16" rx="2" stroke={color} strokeWidth="2" fill="none" />
        <Line x1="8" y1="9" x2="16" y2="9" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Line x1="8" y1="13" x2="13" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M8 16.2 9.8 18 13.5 14.4" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (tab === 'patients') {
    return (
      <Svg width="24" height="24" viewBox="0 0 24 24">
        <Rect x="4" y="5" width="16" height="14" rx="3" stroke={color} strokeWidth="2" fill="none" />
        <Path d="M8 15v-2.5a2.5 2.5 0 0 1 5 0V15" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
        <Circle cx="10.5" cy="9.5" r="1.7" fill={color} />
        <Line x1="15.5" y1="9" x2="18" y2="9" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Line x1="15.5" y1="12.5" x2="18" y2="12.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </Svg>
    );
  }

  if (tab === 'setup') {
    return (
      <Svg width="24" height="24" viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" fill="none" />
        <Path
          d="M12 4.5v2.2M12 17.3v2.2M19.5 12h-2.2M6.7 12H4.5M17.3 6.7l-1.6 1.6M8.3 15.7l-1.6 1.6M17.3 17.3l-1.6-1.6M8.3 8.3 6.7 6.7"
          stroke={color}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  if (tab === 'manual') {
    return (
      <Svg width="24" height="24" viewBox="0 0 24 24">
        <Path d="M6 5.5h6.5a3 3 0 0 1 3 3V18H9a3 3 0 0 0-3 3Z" stroke={color} strokeWidth="2" fill="none" strokeLinejoin="round" />
        <Path d="M18 5.5h-5.5a3 3 0 0 0-3 3V18H15a3 3 0 0 1 3 3Z" stroke={color} strokeWidth="2" fill="none" strokeLinejoin="round" />
      </Svg>
    );
  }

  return (
    <Svg width="24" height="24" viewBox="0 0 24 24">
      <Circle cx="12" cy="7.5" r="2" stroke={color} strokeWidth="2" fill="none" />
      <Path d="M6 18c1.4-3 4-4.5 6-4.5S16.6 15 18 18" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M18 9.5h2M21 9.5h-2M19.5 8v3" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function BottomTabs({ active, setActive }: { active: Tab; setActive: (tab: Tab) => void }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'criteria', label: '환자등록' },
    { id: 'patients', label: '환자 현황' },
    { id: 'setup', label: '초기 세팅' },
    { id: 'manual', label: '매뉴얼' },
    { id: 'qa', label: 'Q&A' },
  ];
  return (
    <View style={styles.tabBar}>
      {tabs.map((item) => (
        <Pressable key={item.id} style={[styles.tabButton, active === item.id && styles.tabButtonActive]} onPress={() => setActive(item.id)}>
          <View style={styles.tabInner}>
            <TabIcon tab={item.id} active={active === item.id} />
            <Text style={[styles.tabText, active === item.id && styles.tabTextActive]}>{item.label}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multilineInput]}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor="#7B8A96"
        multiline={multiline}
        keyboardType={keyboardType}
      />
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Notice({ title, text, tone }: { title: string; text: string; tone: 'warning' | 'blue' }) {
  return (
    <View style={[styles.notice, tone === 'blue' ? styles.noticeBlue : styles.noticeWarning]}>
      <Text style={styles.noticeTitle}>{title}</Text>
      <Text style={styles.noticeText}>{text}</Text>
    </View>
  );
}

function Badge({ text, compact }: { text: string; compact?: boolean }) {
  return (
    <View style={[styles.badge, compact && styles.compactBadge]}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

function StatusPill({ status }: { status: PatientStatus }) {
  return (
    <View style={[styles.statusPill, status === 'stable' && styles.statusStable, status === 'caution' && styles.statusCaution, status === 'checkRequired' && styles.statusDanger]}>
      <Text style={[styles.statusText, status === 'caution' && styles.statusTextDark]}>{statusLabels[status]}</Text>
    </View>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricUnit}>{unit}</Text>
    </View>
  );
}

function VitalMetricCard({
  abnormal,
  acknowledged,
  blink,
  displayLabel,
  label,
  showAlert,
  unit,
  value,
}: {
  abnormal: boolean;
  acknowledged: boolean;
  blink: boolean;
  displayLabel?: string;
  label: VitalMetricName;
  showAlert: boolean;
  unit: string;
  value: string;
}) {
  return (
    <View
      style={[
        styles.vitalMetricCard,
        abnormal && styles.vitalMetricCardAlert,
        abnormal && blink && styles.vitalMetricCardBlink,
        abnormal && acknowledged && styles.vitalMetricCardAck,
      ]}
    >
      <View style={styles.rowBetween}>
        <Text style={[styles.metricLabel, abnormal && styles.vitalMetricLabelAlert]}>{displayLabel ?? label}</Text>
        {abnormal && (showAlert || acknowledged) && (
          <View style={[styles.metricAlertBadge, acknowledged && styles.metricAckBadge]}>
            <Text style={[styles.metricAlertBadgeText, acknowledged && styles.metricAckBadgeText]}>
              {acknowledged ? '확인 완료' : '! 환자 상태를 확인하세요'}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.metricValue, abnormal && styles.vitalMetricValueAlert]}>{value}</Text>
      <Text style={styles.metricUnit}>{unit}</Text>
    </View>
  );
}

function GraphCard({ title, values, min, max, label }: { title: string; values: number[]; min: number; max: number; label: string }) {
  return (
    <View style={styles.graphCard}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Badge text={label} compact />
      </View>
      <View style={styles.graphArea}>
        {values.slice(-34).map((value, index) => {
          const ratio = Math.max(0.04, Math.min(1, (value - min) / (max - min)));
          return <View key={`${value}-${index}`} style={[styles.graphBar, { height: `${ratio * 88 + 8}%` }]} />;
        })}
      </View>
    </View>
  );
}

function TrendLineCard({
  title,
  current,
  unit,
  values,
  min,
  max,
}: {
  title: string;
  current: number;
  unit: string;
  values: number[];
  min: number;
  max: number;
}) {
  return (
    <View style={styles.trendCard}>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.trendTitle}>{title}</Text>
          <Text style={styles.trendSubtitle}>5분마다 기록 · 실시간 시뮬레이션 라인그래프</Text>
        </View>
        <Badge text="DEMO DATA" compact />
      </View>
      <View style={styles.currentValueRow}>
        <Text style={styles.currentValue}>{current}</Text>
        <Text style={styles.currentUnit}>{unit}</Text>
      </View>
      <LineGraph values={values} min={min} max={max} />
    </View>
  );
}

function LineGraph({ values, min, max }: { values: number[]; min: number; max: number }) {
  const data = values.slice(-24);
  const points = data.map((value, index) => {
    const x = 24 + (data.length <= 1 ? 0 : (index / (data.length - 1)) * 304);
    const y = 18 + (1 - Math.max(0, Math.min(1, (value - min) / (max - min)))) * 82;
    return { x, y, value };
  });
  const pointString = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');

  return (
    <View style={styles.lineGraphArea}>
      <Svg width="100%" height="132" viewBox="0 0 360 132" preserveAspectRatio="none">
        <Rect x="0" y="0" width="360" height="132" fill="#F7FEFC" />
        {[18, 59, 100].map((y) => (
          <Line key={`h-${y}`} x1="24" y1={y} x2="342" y2={y} stroke="#D7ECE8" strokeWidth="1" />
        ))}
        {[0, 6, 12, 18, 23].map((index) => {
          const x = 24 + (index / 23) * 304;
          return <Line key={`v-${index}`} x1={x} y1="14" x2={x} y2="108" stroke="#E5F2EF" strokeWidth="1" />;
        })}
        <SvgText x="24" y="124" fill={theme.muted} fontSize="10" fontWeight="700">
          -115분
        </SvgText>
        <SvgText x="292" y="124" fill={theme.muted} fontSize="10" fontWeight="700">
          현재
        </SvgText>
        <Polyline points={pointString} stroke={theme.secondary} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <Circle key={`point-${point.value}-${index}`} cx={point.x} cy={point.y} r={index === points.length - 1 ? 4.8 : 3.4} fill={theme.secondary} stroke={theme.card} strokeWidth="2" />
        ))}
      </Svg>
    </View>
  );
}

function EkgGraphCard({ values }: { values: number[] }) {
  return (
    <View style={styles.graphCard}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardTitle}>EKG 심전도 시뮬레이션 파형</Text>
        <Badge text="시뮬레이션 파형 / 진단용 아님" compact />
      </View>
      <EkgStrip values={values} />
    </View>
  );
}

function MiniEkgStrip({ values }: { values: number[] }) {
  return (
    <View style={styles.miniEkgWrap}>
      <Text style={styles.miniEkgLabel}>EKG DEMO</Text>
      <View style={styles.miniEkgArea}>
        <Svg width="100%" height="42" viewBox="0 0 220 42" preserveAspectRatio="none">
          <Path d={buildEkgPath(values, 220, 42, 0.45)} stroke={theme.secondary} strokeWidth={1} fill="none" />
        </Svg>
      </View>
    </View>
  );
}

function EkgStrip({ values }: { values: number[] }) {
  return (
    <View style={styles.ekgArea}>
      <Svg width="100%" height="136" viewBox="0 0 360 136" preserveAspectRatio="none">
        <Rect x="0" y="0" width="360" height="136" fill="#F7FEFC" />
        {Array.from({ length: 9 }).map((_, index) => (
          <Line key={`v-${index}`} x1={index * 45} y1="0" x2={index * 45} y2="136" stroke="#D7ECE8" strokeWidth="1" />
        ))}
        {Array.from({ length: 5 }).map((_, index) => (
          <Line key={`h-${index}`} x1="0" y1={index * 34} x2="360" y2={index * 34} stroke="#D7ECE8" strokeWidth="1" />
        ))}
        <Line x1="0" y1="68" x2="360" y2="68" stroke="#B9D7D2" strokeWidth="1.4" />
        <Path d={buildEkgPath(values, 360, 136, 1)} stroke={theme.secondary} strokeWidth={1.2} fill="none" />
      </Svg>
    </View>
  );
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => (
        <Pressable key={option.value} style={[styles.segment, value === option.value && styles.segmentActive]} onPress={() => onChange(option.value)}>
          <Text style={[styles.segmentText, value === option.value && styles.segmentTextActive]}>{option.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function getDecision(totalScore: number) {
  if (totalScore >= 6) {
    return {
      title: '적용 권장',
      color: theme.danger,
      reason: '6점 이상은 시연용 임시 기준에서 HiCardi 적용 권장 범위입니다. 실제 적용 여부는 의료진 판단과 병동 프로토콜을 따릅니다.',
    };
  }
  if (totalScore >= 3) {
    return {
      title: '적용 고려',
      color: theme.caution,
      reason: '3-5점은 시연용 임시 기준에서 적용 고려 범위입니다. 단독 의료 판단 기준이 아닙니다.',
    };
  }
  return {
    title: '적용 필요성 낮음',
    color: theme.stable,
    reason: '0-2점은 시연용 임시 기준에서 적용 필요성이 낮은 범위입니다. 실제 상태 변화는 별도 확인이 필요합니다.',
  };
}

function getIndicationFromPatient(departmentCategory: DepartmentCategory, transplantSubtype?: TransplantSubtype): HicardiIndication {
  if (departmentCategory !== 'transplantVascularSurgery') return 'icuTransfer';
  if (transplantSubtype === 'kidney') return 'kidneyTransplant';
  if (transplantSubtype === 'liver') return 'liverTransplant';
  return 'icuTransfer';
}

function getTransplantSubtypeForSave(departmentCategory: DepartmentCategory, transplantSubtype?: TransplantSubtype) {
  return departmentCategory === 'transplantVascularSurgery' ? transplantSubtype ?? 'kidney' : undefined;
}

function getPatientCategorySummary(patient: Patient) {
  const category = departmentCategoryLabels[patient.departmentCategory];
  if (patient.departmentCategory === 'transplantVascularSurgery' && patient.transplantSubtype) {
    return `${category} · ${transplantSubtypeLabels[patient.transplantSubtype]}`;
  }
  return category;
}

function getDemoAnomalyMetrics(vital: VitalSign, targets: PatientTargets = defaultTargets): VitalMetricName[] {
  const metrics: VitalMetricName[] = [];
  // 시연용 더미 기준입니다. 실제 임상 기준 또는 진단 기준으로 사용하지 않습니다.
  if (vital.hr < targets.hrMin || vital.hr > targets.hrMax) metrics.push('HR');
  if (vital.spo2 < targets.spo2Min) metrics.push('SpO2');
  if (vital.rr < targets.rrMin || vital.rr > targets.rrMax) metrics.push('RR');
  if (vital.temperature < targets.skinTempMin || vital.temperature > targets.skinTempMax) metrics.push('SkinTemp');
  return metrics;
}

function getAlertMetrics(vital: VitalSign, targets: PatientTargets = defaultTargets): VitalMetricName[] {
  return getDemoAnomalyMetrics(vital, targets).filter((metric) => alertMetricNames.includes(metric));
}

function normalizeTargets(targets?: PatientTargets): PatientTargets {
  return {
    ...defaultTargets,
    ...(targets ?? {}),
  };
}

function createVital(patientId: string, hr: number, rr: number, spo2: number, temperature: number, signalQuality: SignalQuality): VitalSign {
  return {
    patientId,
    hr,
    rr,
    spo2,
    temperature,
    signalQuality,
    ekgWaveform: createEkgWaveform(),
    hrTrend: createFiveMinuteHistory(hr, 4, 2),
    rrTrend: createFiveMinuteHistory(rr, 1.5, 3),
    spo2Trend: createFiveMinuteHistory(spo2, 0.8, 4),
    temperatureTrend: createFiveMinuteHistory(temperature, 0.18, 5),
    isDemoData: true,
  };
}

function updateCurrentVital(vital: VitalSign, anomalyType?: DemoAnomalyType): VitalSign {
  if (anomalyType) {
    const anomaly = generateAnomalyPatientVitals(anomalyType);
    return {
      ...vital,
      hr: anomaly.hr,
      rr: anomaly.rr,
      spo2: anomaly.spo2,
      temperature: anomaly.skinTemperature,
      signalQuality: anomaly.signalQuality,
      ekgWaveform: createEkgWaveform(),
    };
  }
  const nextHr = clamp(Math.round(vital.hr + randomStep(4)), 78, 96);
  const nextRr = clamp(Math.round(vital.rr + randomStep(2)), 14, 20);
  const nextSpo2 = clamp(Math.round(vital.spo2 + randomStep(1)), 96, 99);
  const nextTemp = clamp(vital.temperature + randomStep(0.15), 35.8, 36.8);
  return {
    ...vital,
    hr: nextHr,
    rr: nextRr,
    spo2: nextSpo2,
    temperature: nextTemp,
    signalQuality: 'good',
    ekgWaveform: createEkgWaveform(),
  };
}

function appendFiveMinuteVitalRecord(vital: VitalSign): VitalSign {
  return {
    ...vital,
    hrTrend: [...vital.hrTrend.slice(-24), vital.hr],
    rrTrend: [...vital.rrTrend.slice(-24), vital.rr],
    spo2Trend: [...vital.spo2Trend.slice(-24), vital.spo2],
    temperatureTrend: [...vital.temperatureTrend.slice(-24), vital.temperature],
  };
}

function createFiveMinuteHistory(base: number, amplitude: number, period: number) {
  return Array.from({ length: 25 }, (_, index) => base + Math.sin(index / period) * amplitude + randomStep(amplitude * 0.35));
}

function createEkgWaveform() {
  const beat = [50, 51, 53, 56, 52, 50, 48, 44, 88, 20, 60, 52, 51, 54, 58, 61, 59, 55, 52, 50, 50, 50];
  return Array.from({ length: 88 }, (_, index) => beat[index % beat.length] + Math.sin(index / 3) * 1.4);
}

function buildEkgPath(values: number[], width: number, height: number, amplitude: number) {
  const data = values.length ? values.slice(-88) : createEkgWaveform();
  const points = data.map((value, index) => {
    const x = (index / Math.max(1, data.length - 1)) * width;
    const y = height / 2 - (value - 50) * amplitude;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  return points.join(' ');
}

function randomStep(size: number) {
  return (Math.random() - 0.5) * size;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.background,
  },
  appShell: {
    flex: 1,
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    backgroundColor: theme.background,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
    minHeight: 54,
    justifyContent: 'center',
    backgroundColor: theme.primary,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: '#DCECF5',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 17,
    marginTop: 3,
  },
  content: {
    padding: 14,
    paddingBottom: 96,
  },
  screen: {
    gap: 12,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionCaption: {
    color: theme.muted,
    fontSize: 14,
  },
  notice: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  noticeWarning: {
    backgroundColor: theme.warningSoft,
    borderColor: '#F8D38B',
  },
  noticeBlue: {
    backgroundColor: theme.primarySoft,
    borderColor: '#B8D3E5',
  },
  noticeTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '800',
  },
  noticeText: {
    color: theme.text,
    fontSize: 13,
    lineHeight: 19,
  },
  twoCols: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  field: {
    minWidth: 180,
    flex: 1,
    gap: 5,
  },
  label: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
  },
  helperText: {
    color: theme.muted,
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.text,
  },
  multilineInput: {
    minHeight: 76,
    textAlignVertical: 'top',
  },
  segmented: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  segment: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
  },
  segmentActive: {
    backgroundColor: theme.secondary,
    borderColor: theme.secondary,
  },
  segmentText: {
    color: theme.text,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  checkCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
  },
  checkCardActive: {
    borderColor: theme.secondary,
    backgroundColor: theme.secondarySoft,
  },
  fakeCheck: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#8AA3B5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  fakeCheckActive: {
    backgroundColor: theme.secondary,
    borderColor: theme.secondary,
  },
  fakeCheckText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  flex: {
    flex: 1,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    flex: 1,
    color: theme.text,
    fontSize: 16,
    fontWeight: '800',
  },
  cardText: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  score: {
    color: theme.primary,
    fontSize: 15,
    fontWeight: '900',
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: theme.primarySoft,
  },
  compactBadge: {
    marginTop: 0,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  badgeText: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  resultCard: {
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: theme.card,
    padding: 14,
  },
  resultScore: {
    color: theme.text,
    fontSize: 34,
    fontWeight: '900',
  },
  resultTitle: {
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 4,
  },
  summary: {
    borderRadius: 8,
    padding: 12,
    backgroundColor: theme.card,
    color: theme.text,
    lineHeight: 21,
    borderWidth: 1,
    borderColor: theme.border,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: theme.primary,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  disabledButton: {
    backgroundColor: '#8AA3B5',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.primary,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: theme.card,
  },
  secondaryButtonText: {
    color: theme.primary,
    fontWeight: '800',
  },
  formButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  demoButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.secondary,
    backgroundColor: theme.secondary,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  demoButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  anomalyModeBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: theme.warningSoft,
    borderWidth: 1,
    borderColor: theme.caution,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  anomalyModeBadgeText: {
    color: theme.danger,
    fontSize: 12,
    fontWeight: '900',
  },
  patientCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
  },
  patientCardActive: {
    borderColor: theme.secondary,
    backgroundColor: theme.secondarySoft,
  },
  slotCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    padding: 12,
    gap: 10,
  },
  slotCardActive: {
    borderColor: theme.secondary,
    backgroundColor: theme.secondarySoft,
  },
  emptySlotCard: {
    minHeight: 96,
    borderStyle: 'dashed',
    backgroundColor: '#F8FBFC',
  },
  slotCardWatch: {
    borderLeftWidth: 5,
    borderLeftColor: theme.caution,
  },
  slotCardAlert: {
    borderLeftWidth: 5,
    borderLeftColor: theme.danger,
  },
  slotCardAlertDemo: {
    borderLeftWidth: 5,
    borderLeftColor: '#FF4D4F',
    backgroundColor: '#FFF7F7',
  },
  slotCardAcknowledged: {
    borderLeftWidth: 5,
    borderLeftColor: '#98A2B3',
  },
  slotTitle: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  slotInfo: {
    marginTop: 8,
    gap: 3,
  },
  patientNameAlertArea: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginLeft: -8,
  },
  patientNameAlertAreaActive: {
    backgroundColor: '#FFE5E5',
  },
  patientNameAlertAreaBlink: {
    backgroundColor: '#FFB3B3',
    opacity: 0.45,
  },
  patientNameAlertAreaAck: {
    backgroundColor: '#F2F4F7',
  },
  slotPatientName: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '900',
  },
  slotPatientNameAlert: {
    color: '#B42318',
  },
  inlineAlertBadge: {
    borderRadius: 999,
    backgroundColor: '#FF4D4F',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inlineAckBadge: {
    backgroundColor: '#E4E7EC',
  },
  inlineAlertBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  inlineAckBadgeText: {
    color: theme.text,
  },
  slotMeta: {
    color: theme.muted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  anomalyMetricSummary: {
    color: '#B42318',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 3,
  },
  referenceMetricSummary: {
    color: theme.caution,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 3,
  },
  emptySlotInner: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlotText: {
    color: '#8AA3B5',
    fontSize: 14,
    fontWeight: '800',
  },
  alertIcon: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: theme.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertIconText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
  },
  expandedVitalsPanel: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B9D7D2',
    backgroundColor: theme.card,
    padding: 12,
    gap: 10,
  },
  slideHandle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#B9D7D2',
    marginBottom: 2,
  },
  expandedTitle: {
    color: theme.text,
    fontSize: 17,
    fontWeight: '900',
  },
  targetCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: '#F8FBFC',
    padding: 12,
    gap: 10,
  },
  targetTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '900',
  },
  targetCaption: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  targetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  targetSummary: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B9D7D2',
    backgroundColor: theme.secondarySoft,
    padding: 10,
  },
  targetSummaryText: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 19,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusStable: {
    backgroundColor: theme.stable,
  },
  statusCaution: {
    backgroundColor: theme.caution,
  },
  statusDanger: {
    backgroundColor: theme.danger,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  statusTextDark: {
    color: theme.text,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    flexGrow: 1,
    minWidth: 124,
    borderRadius: 8,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderTopWidth: 3,
    borderTopColor: theme.secondary,
    padding: 12,
  },
  vitalMetricCard: {
    flexGrow: 1,
    minWidth: 150,
    borderRadius: 8,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderTopWidth: 3,
    borderTopColor: theme.secondary,
    padding: 12,
  },
  vitalMetricCardAlert: {
    backgroundColor: '#FFE5E5',
    borderColor: '#FF4D4F',
    borderTopColor: '#FF4D4F',
  },
  vitalMetricCardBlink: {
    backgroundColor: '#FFB3B3',
    opacity: 0.45,
  },
  vitalMetricCardAck: {
    opacity: 1,
    backgroundColor: '#FFF7F7',
  },
  metricLabel: {
    color: theme.muted,
    fontWeight: '800',
  },
  vitalMetricLabelAlert: {
    color: '#B42318',
  },
  metricValue: {
    color: theme.text,
    fontSize: 26,
    fontWeight: '900',
    marginTop: 3,
  },
  vitalMetricValueAlert: {
    color: '#B42318',
  },
  metricUnit: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  metricAlertBadge: {
    borderRadius: 999,
    backgroundColor: '#FF4D4F',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  metricAckBadge: {
    backgroundColor: '#E4E7EC',
  },
  metricAlertBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  metricAckBadgeText: {
    color: theme.text,
  },
  acknowledgePanel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFB3B3',
    backgroundColor: '#FFE5E5',
    padding: 12,
    gap: 10,
  },
  acknowledgeText: {
    color: '#B42318',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 19,
  },
  acknowledgeButton: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    backgroundColor: '#B42318',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  acknowledgeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  trendCard: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    gap: 10,
  },
  trendTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '900',
  },
  trendSubtitle: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  currentValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  currentValue: {
    color: theme.primary,
    fontSize: 38,
    fontWeight: '900',
    lineHeight: 42,
  },
  currentUnit: {
    color: theme.muted,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 5,
  },
  lineGraphArea: {
    height: 132,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B9D7D2',
    backgroundColor: '#F7FEFC',
    overflow: 'hidden',
    position: 'relative',
    paddingHorizontal: 8,
  },
  lineGridTop: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: '20%',
    height: 1,
    backgroundColor: '#D7ECE8',
  },
  lineGridMid: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: '50%',
    height: 1,
    backgroundColor: '#D7ECE8',
  },
  lineGridBottom: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: '80%',
    height: 1,
    backgroundColor: '#D7ECE8',
  },
  lineSegment: {
    position: 'absolute',
    height: 3,
    borderRadius: 999,
    backgroundColor: theme.secondary,
  },
  linePoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    marginLeft: -4,
    marginTop: -4,
    borderRadius: 999,
    backgroundColor: theme.secondary,
    borderWidth: 2,
    borderColor: theme.card,
  },
  graphCard: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    gap: 10,
  },
  graphArea: {
    height: 126,
    borderRadius: 8,
    backgroundColor: '#EDF4F7',
    borderWidth: 1,
    borderColor: theme.border,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  graphBar: {
    flex: 1,
    minWidth: 3,
    borderRadius: 999,
    backgroundColor: theme.secondary,
  },
  ekgArea: {
    height: 136,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B9D7D2',
    backgroundColor: '#F7FEFC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 10,
    overflow: 'hidden',
  },
  ekgBaseline: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 67,
    height: 1,
    backgroundColor: '#CFE7E3',
  },
  ekgSegment: {
    flex: 1,
    minWidth: 3,
    maxWidth: 8,
    borderRadius: 999,
    backgroundColor: theme.secondary,
  },
  miniEkgWrap: {
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B9D7D2',
    backgroundColor: '#F7FEFC',
    padding: 8,
  },
  miniEkgLabel: {
    color: theme.primary,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 5,
  },
  miniEkgArea: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    overflow: 'hidden',
  },
  ekgSegmentMini: {
    flex: 1,
    minWidth: 2,
    borderRadius: 999,
    backgroundColor: theme.secondary,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    padding: 12,
  },
  stepRowDone: {
    backgroundColor: theme.secondarySoft,
    borderColor: theme.secondary,
  },
  stepText: {
    flex: 1,
    color: theme.text,
    fontSize: 15,
    fontWeight: '700',
  },
  manualCard: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    padding: 12,
  },
  searchHistoryWrap: {
    gap: 8,
  },
  searchHistoryLabel: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  searchHistoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  searchHistoryChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#B8D3E5',
    backgroundColor: theme.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  searchHistoryChipText: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  favoriteButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.card,
  },
  favoriteButtonActive: {
    backgroundColor: theme.warningSoft,
    borderColor: theme.caution,
  },
  favoriteText: {
    color: theme.caution,
    fontSize: 22,
    fontWeight: '900',
  },
  qaCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    padding: 12,
  },
  detailCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    padding: 12,
  },
  detailTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },
  detailStep: {
    color: theme.text,
    fontSize: 15,
    lineHeight: 25,
  },
  warningText: {
    color: theme.danger,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 10,
    lineHeight: 19,
  },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: theme.card,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    minHeight: 72,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabButtonActive: {
    backgroundColor: theme.primary,
  },
  tabText: {
    color: theme.muted,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 12,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
});



