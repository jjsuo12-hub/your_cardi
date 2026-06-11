import React, { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
  StyleProp,
  Text,
  TextInput,
  UIManager,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Circle, Line, Path, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { useFonts } from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DemoAnomalyToggle } from './components/DemoAnomalyToggle';
import { PatientVitalsScreen } from './screens/PatientVitalsScreen';
import { VitalSignsHistoryChart } from './components/VitalSignsHistoryChart';
import { CURRENT_DATA_SOURCE_LABEL, emrRepository } from './api/emr/emrRepository';
import {
  createPatientVitalSnapshot,
  getDemoVitalsSnapshotMap,
  getDemoWardPatientTemplatesSnapshot,
  getDemoWardPatientsSnapshot,
  searchDemoEmrPatientByNumber,
} from './api/emr/demoEmrClient';
import { demoHicardiClient } from './api/hicardi/demoHicardiClient';
import { faqItems } from './data/faqData';
import { manualSteps, ManualStepSection, ManualTabContent } from './data/manualData';
import { manualImageAssets, ManualImageKey } from './data/manualImageAssets';
import { defaultTargets } from './data/demoWardPatients';
import { mapVitalSnapshotToNews2Input } from './mappers/emrMapper';
import { mapAssessmentToHicardiMonitoringOrder, mapRawHicardiPayloadToVitalSnapshot } from './mappers/hicardiMapper';
import {
  AppPatient,
  HicardiAssessmentRecord,
  HicardiSpecialCriteria,
  News2Band,
  News2Input,
  News2Result,
  VitalSnapshot,
} from './types/appClinicalTypes';
import {
  DemoAnomalyType,
  generateAnomalyPatientVitals,
  generateNormalPatientVitals,
  pickRandomAnomalyType,
  pickRandomPatients,
} from './utils/generateDemoPatientVitals';
import {
  DepartmentCategory,
  HicardiIndication,
  PatientTargets,
  PatientVitalSnapshot,
  SignalQuality,
  TransferSource,
  TransplantSubtype,
  VitalMetricType,
  WardPatient,
} from './types/emrTypes';
import { evaluateHicardiDecision } from './utils/hicardiDecisionEngine';
import { calculateNews2 } from './utils/news2Calculator';

type Tab = 'criteria' | 'patients' | 'manual' | 'qa';
type PatientStatus = 'stable' | 'caution' | 'checkRequired';
type VitalMetricName = VitalMetricType;
type DemoSearchResult = NonNullable<Awaited<ReturnType<typeof searchDemoEmrPatientByNumber>>>;

type PatientAlertState = {
  patientId: string;
  hasAnomaly: boolean;
  anomalyMetrics: VitalMetricName[];
  isAcknowledged: boolean;
  acknowledgedAt?: number;
  suppressAlertUntil?: number;
};

type Patient = WardPatient & {
  name: string;
  indication?: HicardiIndication;
  status: PatientStatus;
  latestAlert?: string;
  battery: number;
};
type VitalSign = PatientVitalSnapshot;

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

const TAB_BAR_BASE_HEIGHT = 72;
const CONTENT_MAX_WIDTH = 720;

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
const webTextWrapStyle = Platform.OS === 'web' ? { wordBreak: 'keep-all', overflowWrap: 'break-word' } : {};

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

const MANUAL_FAVORITES_KEY = 'manual_favorites';

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

function mapWardPatientToLegacyPatient(patient: WardPatient & { indication?: HicardiIndication }): Patient {
  return {
    ...patient,
    name: patient.displayName,
    indication: patient.indication,
    status: 'stable',
    latestAlert: 'Stable demo',
    battery: patient.battery ?? 90,
  };
}

function cloneLegacyPatient(patient: Patient): Patient {
  return {
    ...patient,
    targets: { ...patient.targets },
  };
}

const bootstrapPatients = getDemoWardPatientsSnapshot().map(mapWardPatientToLegacyPatient);
const bootstrapVitals = getDemoVitalsSnapshotMap();
const bootstrapSelectedPatientId = bootstrapPatients[0]?.id ?? '';

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AppRoot />
    </SafeAreaProvider>
  );
}

function AppRoot() {
  const contentScrollRef = React.useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts(customFontAssets);
  const [tab, setTab] = useState<Tab>('patients');
  const [patients, setPatients] = useState<Patient[]>(bootstrapPatients);
  const [selectedPatientId, setSelectedPatientId] = useState(bootstrapSelectedPatientId);
  const [vitals, setVitals] = useState<Record<string, VitalSign>>(bootstrapVitals);
  const [isDemoAnomalyMode, setIsDemoAnomalyMode] = useState(false);
  const [anomalyTypes, setAnomalyTypes] = useState<Record<string, DemoAnomalyType>>({});
  const [patientAlertStates, setPatientAlertStates] = useState<Record<string, PatientAlertState>>({});
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);
  const [activePatientDetailTab, setActivePatientDetailTab] = useState<'ecg' | 'history' | 'target' | 'record' | null>(null);
  const [blinkOn, setBlinkOn] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [manualSearch, setManualSearch] = useState('');
  const [manualSearchHistory, setManualSearchHistory] = useState<string[]>([]);
  const [qaSearch, setQaSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [patientSearchNumber, setPatientSearchNumber] = useState('');
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);
  const [searchedPatientResult, setSearchedPatientResult] = useState<DemoSearchResult | null>(null);
  const [searchedHicardiVital, setSearchedHicardiVital] = useState<VitalSnapshot | null>(null);
  const [assessmentPatient, setAssessmentPatient] = useState<DemoSearchResult | null>(null);
  const [assessmentInput, setAssessmentInput] = useState<News2Input | null>(null);
  const [specialCriteria, setSpecialCriteria] = useState<HicardiSpecialCriteria>({
    icuOrEr: false,
    highRiskSurgeryOrTransplant: false,
    age65OrOlder: false,
  });
  const [emergencyApply, setEmergencyApply] = useState(false);
  const [assessmentRecords, setAssessmentRecords] = useState<HicardiAssessmentRecord[]>([]);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function hydrateManualFavorites() {
      try {
        const raw = await AsyncStorage.getItem(MANUAL_FAVORITES_KEY);
        if (!raw || !active) return;
        const parsed = JSON.parse(raw) as Array<{ stepId?: string }>;
        const validIds = new Set(manualSteps.map((step) => step.id));
        const nextFavorites = parsed
          .map((item) => item.stepId)
          .filter((stepId): stepId is string => Boolean(stepId && validIds.has(stepId)));
        if (active) {
          setFavorites(nextFavorites);
        }
      } catch {
        if (active) {
          setFavorites([]);
        }
      }
    }

    hydrateManualFavorites().catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(
      MANUAL_FAVORITES_KEY,
      JSON.stringify(favorites.map((stepId) => ({ stepId }))),
    ).catch(() => undefined);
  }, [favorites]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => setReduceMotion(false));
    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);
    return () => subscription?.remove?.();
  }, []);

  useEffect(() => {
    let active = true;

    async function hydrateFromRepository() {
      const wardPatients = await emrRepository.getWardPatients();
      if (!active) return;

      const nextPatients = wardPatients.map((patient) => mapWardPatientToLegacyPatient(patient as WardPatient & { indication?: HicardiIndication }));
      setPatients(nextPatients);
      setSelectedPatientId((current) => current || nextPatients[0]?.id || '');
      setExpandedPatientId((current) => (current && nextPatients.some((patient) => patient.id === current) ? current : null));

      const vitalEntries = await Promise.all(
        wardPatients.map(async (patient) => {
          const vital = await emrRepository.getPatientVitals(patient.id);
          return [patient.id, vital] as const;
        }),
      );

      if (!active) return;

      setVitals((current) => ({
        ...current,
        ...Object.fromEntries(vitalEntries.filter((entry): entry is [string, VitalSign] => Boolean(entry[1]))),
      }));
    }

    hydrateFromRepository().catch(() => undefined);

    return () => {
      active = false;
    };
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

  const appliedPatients = patients.filter((patient) => patient.hicardiStatus === 'applied');
  const assessmentNews2Result = useMemo<News2Result | null>(
    () => (assessmentInput ? calculateNews2(assessmentInput) : null),
    [assessmentInput],
  );
  const assessmentDecision = useMemo(
    () => (assessmentNews2Result ? evaluateHicardiDecision(assessmentNews2Result, specialCriteria, emergencyApply) : null),
    [assessmentNews2Result, specialCriteria, emergencyApply],
  );
  const selectedPatientAssessmentRecords = useMemo(
    () =>
      assessmentPatient
        ? assessmentRecords.filter((record) => record.patientNumber === assessmentPatient.patient.patientNumber).sort((a, b) => b.assessedAt.localeCompare(a.assessedAt))
        : [],
    [assessmentPatient, assessmentRecords],
  );

  const saveManualSearch = (value: string) => {
    const normalized = value.trim();
    if (!normalized) return;
    setManualSearchHistory((current) => [normalized, ...current.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 5));
  };

  const selectCandidatePatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    setExpandedPatientId(patientId);
  };

  const handlePatientSearch = async () => {
    const normalized = patientSearchNumber.trim().toUpperCase();
    setPatientSearchNumber(normalized);
    if (!normalized) {
      setSearchFeedback('환자번호를 입력하세요.');
      setSearchedPatientResult(null);
      setSearchedHicardiVital(null);
      return;
    }

    const result = await searchDemoEmrPatientByNumber(normalized);
    if (!result) {
      setSearchFeedback('해당 환자번호와 일치하는 EMR 연동 환자 정보가 없습니다. 본 앱은 시연용 더미 데이터만 제공합니다.');
      setSearchedPatientResult(null);
      setSearchedHicardiVital(null);
      return;
    }

    const latestPayload = await demoHicardiClient.getLatestPayloadByPatientNumber(normalized);
    setSearchedHicardiVital(latestPayload ? mapRawHicardiPayloadToVitalSnapshot(normalized, latestPayload) : null);
    setSearchedPatientResult(result);
    setSearchFeedback(null);
  };

  const startAssessmentForPatient = () => {
    if (!searchedPatientResult) return;
    setAssessmentPatient(searchedPatientResult);
    setAssessmentInput(mapVitalSnapshotToNews2Input(searchedPatientResult.vital));
    setSpecialCriteria(getDefaultSpecialCriteria(searchedPatientResult.patient, searchedPatientResult.meta));
    setEmergencyApply(false);
  };

  const updateSpecialCriterion = (key: keyof HicardiSpecialCriteria) => {
    setSpecialCriteria((current) => ({ ...current, [key]: !current[key] }));
  };

  const upsertPatientFromAssessment = (
    patient: AppPatient,
    status: HicardiAssessmentRecord['status'],
    reason: string,
  ) => {
    const legacyStatus = mapAssessmentStatusToLegacyStatus(status);
    const existingPatient = patients.find((item) => item.patientNumber === patient.patientNumber);
    const startedAt = new Date().toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    if (existingPatient) {
      setPatients((current) =>
        current.map((item) =>
          item.patientNumber === patient.patientNumber
            ? {
                ...item,
                displayName: patient.displayName,
                name: patient.displayName,
                emrPatientId: patient.emrPatientId,
                encounterId: patient.encounterId,
                departmentCategory: mapDepartmentLabelToLegacyCategory(patient.departmentCategory),
                transplantSubtype: patient.transplantSubtype,
                transferSource: mapTransferLabelToLegacySource(patient.transferSource),
                pod: patient.pod,
                applicationReason: reason,
                hicardiStatus: legacyStatus,
                latestAlert: `${getAssessmentStatusLabel(status)} / 시연용 프로토타입`,
                hicardiStartTime: legacyStatus === 'applied' ? startedAt : item.hicardiStartTime,
              }
            : item,
        ),
      );
      setSelectedPatientId(existingPatient.id);
      setExpandedPatientId(existingPatient.id);
      return;
    }

    const newId = `assessment-${patient.patientNumber}`;
    const newPatient: Patient = {
      id: newId,
      emrPatientId: patient.emrPatientId,
      encounterId: patient.encounterId,
      displayName: patient.displayName,
      name: patient.displayName,
      patientNumber: patient.patientNumber,
      indication: getIndicationFromPatient(
        mapDepartmentLabelToLegacyCategory(patient.departmentCategory),
        patient.transplantSubtype,
      ),
      departmentCategory: mapDepartmentLabelToLegacyCategory(patient.departmentCategory),
      transplantSubtype: patient.transplantSubtype,
      transferSource: mapTransferLabelToLegacySource(patient.transferSource),
      applicationReason: reason,
      memo: '적용 평가 화면에서 생성된 시연용 환자입니다.',
      targets: { ...defaultTargets },
      room: patient.room.replace('8A-', ''),
      bed: patient.bed,
      pod: patient.pod,
      hicardiStatus: legacyStatus,
      hicardiStartTime: legacyStatus === 'applied' ? startedAt : undefined,
      status: 'stable',
      latestAlert: `${getAssessmentStatusLabel(status)} / 시연용 프로토타입`,
      battery: 88,
      source: 'demo',
      isDemoData: true,
    };
    setPatients((current) => [newPatient, ...current]);
    setVitals((current) => ({
      ...current,
      [newId]: createVital(
        newId,
        assessmentPatient?.vital.hr ?? 82,
        assessmentPatient?.vital.rr ?? 18,
        assessmentPatient?.vital.spo2 ?? 98,
        assessmentPatient?.vital.temperature ?? 36.7,
        'good',
      ),
    }));
    setSelectedPatientId(newId);
    setExpandedPatientId(newId);
  };

  const createAssessmentRecord = (
    status: HicardiAssessmentRecord['status'],
    statusReasonSuffix?: string,
  ): HicardiAssessmentRecord | null => {
    if (!assessmentPatient || !assessmentInput || !assessmentNews2Result || !assessmentDecision) return null;
    const specialCriteriaCount = countSpecialCriteria(specialCriteria);
    const applicationReason = buildAssessmentReasonSummary(
      assessmentPatient.patient,
      assessmentNews2Result,
      specialCriteria,
      assessmentDecision.finalLabel,
      emergencyApply,
      statusReasonSuffix,
    );
    return {
      id: `assessment-${assessmentPatient.patient.patientNumber}-${Date.now()}`,
      patientNumber: assessmentPatient.patient.patientNumber,
      emrPatientId: assessmentPatient.patient.emrPatientId,
      encounterId: assessmentPatient.patient.encounterId,
      assessedAt: new Date().toISOString(),
      news2Score: assessmentNews2Result.totalScore,
      news2Band: assessmentNews2Result.band,
      specialCriteria,
      specialCriteriaCount,
      decision: assessmentDecision.decision,
      status,
      applicationReason,
      nextReassessmentLabel: assessmentDecision.nextReassessmentLabel,
      source: 'demo',
    };
  };

  const saveAssessmentRecord = (status: HicardiAssessmentRecord['status']) => {
    const record = createAssessmentRecord(status);
    if (!record || !assessmentPatient) return;
    setAssessmentRecords((current) => [record, ...current]);
    const monitoringOrder = mapAssessmentToHicardiMonitoringOrder(record);
    upsertPatientFromAssessment(assessmentPatient.patient, status, `${record.applicationReason} / ${monitoringOrder.note}`);
  };

  const resetAssessment = () => {
    if (!assessmentPatient) return;
    setAssessmentInput(mapVitalSnapshotToNews2Input(assessmentPatient.vital));
    setSpecialCriteria(getDefaultSpecialCriteria(assessmentPatient.patient, assessmentPatient.meta));
    setEmergencyApply(false);
  };

  const updateSelectedPatientApplicationReason = (value: string) => {
    setPatients((current) =>
      current.map((patient) => (patient.id === selectedPatientId ? { ...patient, applicationReason: value } : patient)),
    );
  };

  const updatePatientTargets = (patientId: string, targets: PatientTargets) => {
    setPatients((current) => current.map((patient) => (patient.id === patientId ? { ...patient, targets } : patient)));
  };

  const generateDemoData = () => {
    const statuses: PatientStatus[] = ['stable', 'stable', 'stable', 'stable', 'stable'];
    const demoPatients = getDemoWardPatientTemplatesSnapshot().map((template, index) => {
      const id = `demo-p${index + 1}-${Date.now()}`;
      const battery = clamp(Math.round(92 - index * 16 + randomStep(8)), 12, 98);
      return {
        ...mapWardPatientToLegacyPatient(template),
        id,
        emrPatientId: `${template.emrPatientId}-${Date.now()}`,
        encounterId: `${template.encounterId ?? template.id}-${Date.now()}`,
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

  const toggleExpandedPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    setExpandedPatientId((current) => {
      if (current === patientId) {
        setActivePatientDetailTab(null);
        return null;
      }
      setActivePatientDetailTab(null);
      return patientId;
    });
  };

  if (!fontsLoaded) return null;

  const bottomInset = Math.max(insets.bottom, 12);
  const tabBarHeight = TAB_BAR_BASE_HEIGHT + bottomInset;
  const headerStyle = [
    styles.header,
    {
      paddingTop: insets.top + 12,
      minHeight: 76 + insets.top,
    },
  ];
  const contentContainerStyle = [
    styles.content,
    {
      paddingBottom: tabBarHeight + 32,
    },
  ];
  const tabBarStyle = [
    styles.tabBar,
    {
      height: tabBarHeight,
      paddingBottom: bottomInset,
    },
  ];

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={theme.primary} />
      <View style={styles.appShell}>
        <View style={headerStyle}>
          <Text style={styles.headerTitle}>YOUR_Cardi:</Text>
          <Text style={styles.headerSubtitle}>HiCardi 적용 판단과 모니터링 보조 병동 간호 지원 어플리케이션</Text>
        </View>
        <ScrollView ref={contentScrollRef} contentContainerStyle={contentContainerStyle}>
          {tab === 'criteria' && (
            <CriteriaScreen
              patientSearchNumber={patientSearchNumber}
              setPatientSearchNumber={setPatientSearchNumber}
              onSearch={handlePatientSearch}
              searchFeedback={searchFeedback}
              searchedPatientResult={searchedPatientResult}
              searchedHicardiVital={searchedHicardiVital}
              startAssessmentForPatient={startAssessmentForPatient}
              assessmentPatient={assessmentPatient}
              specialCriteria={specialCriteria}
              updateSpecialCriterion={updateSpecialCriterion}
              emergencyApply={emergencyApply}
              setEmergencyApply={setEmergencyApply}
              news2Result={assessmentNews2Result}
              assessmentDecision={assessmentDecision}
              assessmentRecords={selectedPatientAssessmentRecords}
              saveAsCandidate={() => saveAssessmentRecord('candidate')}
              saveAssessmentOnly={() => {
                const record = createAssessmentRecord(assessmentDecision?.recommendedStatus ?? 'maintained');
                if (!record) return;
                setAssessmentRecords((current) => [record, ...current]);
              }}
              resetAssessment={resetAssessment}
            />
          )}
          {tab === 'patients' && (
            <PatientsScreen
              patients={appliedPatients}
              vitals={vitals}
              expandedPatientId={expandedPatientId}
              activePatientDetailTab={activePatientDetailTab}
              toggleExpandedPatient={toggleExpandedPatient}
              toggleDetailTab={(tabName) => setActivePatientDetailTab((current) => (current === tabName ? null : tabName))}
              isDemoAnomalyMode={isDemoAnomalyMode}
              toggleDemoAnomalyMode={toggleDemoAnomalyMode}
              patientAlertStates={patientAlertStates}
              acknowledgePatientAnomaly={acknowledgePatientAnomaly}
              updatePatientTargets={updatePatientTargets}
              blinkOn={blinkOn}
              reduceMotion={reduceMotion}
            />
          )}
          {tab === 'manual' && (
            <ManualScreen
              search={manualSearch}
              setSearch={setManualSearch}
              saveSearch={saveManualSearch}
              searchHistory={manualSearchHistory}
              favorites={favorites}
              setFavorites={setFavorites}
              scrollToY={(y) => contentScrollRef.current?.scrollTo({ y, animated: true })}
            />
          )}
          {tab === 'qa' && <QaScreen search={qaSearch} setSearch={setQaSearch} />}
        </ScrollView>
        <BottomTabs active={tab} setActive={setTab} tabBarStyle={tabBarStyle} />
      </View>
    </View>
  );
}

function CriteriaScreen({
  patientSearchNumber,
  setPatientSearchNumber,
  onSearch,
  searchFeedback,
  searchedPatientResult,
  searchedHicardiVital,
  startAssessmentForPatient,
  assessmentPatient,
  specialCriteria,
  updateSpecialCriterion,
  emergencyApply,
  setEmergencyApply,
  news2Result,
  assessmentDecision,
  assessmentRecords,
  saveAsCandidate,
  saveAssessmentOnly,
  resetAssessment,
}: {
  patientSearchNumber: string;
  setPatientSearchNumber: React.Dispatch<React.SetStateAction<string>>;
  onSearch: () => void;
  searchFeedback: string | null;
  searchedPatientResult: DemoSearchResult | null;
  searchedHicardiVital: VitalSnapshot | null;
  startAssessmentForPatient: () => void;
  assessmentPatient: DemoSearchResult | null;
  specialCriteria: HicardiSpecialCriteria;
  updateSpecialCriterion: (key: keyof HicardiSpecialCriteria) => void;
  emergencyApply: boolean;
  setEmergencyApply: React.Dispatch<React.SetStateAction<boolean>>;
  news2Result: News2Result | null;
  assessmentDecision: ReturnType<typeof evaluateHicardiDecision> | null;
  assessmentRecords: HicardiAssessmentRecord[];
  saveAsCandidate: () => void;
  saveAssessmentOnly: () => void;
  resetAssessment: () => void;
}) {
  const isDirectStart = Boolean(news2Result && news2Result.totalScore >= 7 && assessmentDecision);
  const nextReassessmentLabel = assessmentDecision?.nextReassessmentLabel ?? '평가 후 재확인';
  const searchedPatient = searchedPatientResult?.patient;
  const searchedVital = searchedPatientResult?.vital;
  const showPatientSummary = Boolean(searchedPatientResult);
  const showAssessment = Boolean(assessmentPatient && news2Result && assessmentDecision);
  const currentStep = showAssessment ? 4 : showPatientSummary ? 2 : 1;
  const news2Rows = searchedVital ? getPopupVitalItems(searchedVital) : [];

  return (
    <View style={[styles.screen, styles.criteriaScreen]}>
      <ScreenHeader
        title="HiCardi 적용 평가"
        description="환자검색부터 NEWS2, 병동 특수 기준, 적용 결과까지 단계별로 확인합니다."
        right={<DemoBadge text={`DEMO · ${CURRENT_DATA_SOURCE_LABEL} / 실제 EMR·HiCardi 미연결`} />}
      />

      <StepProgress
        currentStep={currentStep}
        steps={['환자검색', '정보확인', 'NEWS2', '결과']}
      />

      <SectionCard title="1. 환자번호 검색" caption="예시: P-240601, P-240602, P-240603, P-240604">
        <View style={styles.criteriaSearchBlock}>
          <Field
            label="환자번호"
            value={patientSearchNumber}
            onChangeText={setPatientSearchNumber}
            onBlur={onSearch}
            placeholder="환자번호를 입력하세요"
          />
          <Pressable style={styles.searchButtonLarge} onPress={onSearch}>
            <Text style={styles.searchButtonText}>검색</Text>
          </Pressable>
        </View>
        {searchFeedback ? <Text style={styles.warningText}>{searchFeedback}</Text> : null}
      </SectionCard>

      {showPatientSummary && searchedPatient && searchedVital ? (
        <SectionCard title="2. EMR 환자정보 확인" caption="핵심 정보만 먼저 보여주고, 세부 정보는 접어둡니다.">
          <View style={styles.summaryHeroCard}>
            <View style={styles.rowBetween}>
              <View style={styles.flex}>
                <Text style={styles.summaryHeroTitle}>{searchedPatient.displayName}</Text>
                <Text style={styles.summaryHeroMeta}>
                  환자번호 {searchedPatient.patientNumber} · {searchedPatient.room}-{searchedPatient.bed}
                </Text>
              </View>
              <StatusChip label={getAssessmentStatusLabel(searchedPatient.currentHicardiStatus)} tone="neutral" />
            </View>
            <View style={styles.summaryInfoGrid}>
              <KeyValue label="진료과" value={searchedPatient.departmentCategory} />
              <KeyValue label="POD" value={`${searchedPatient.pod ?? '-'}`} />
              <KeyValue label="전동 출처" value={searchedPatient.transferSource ?? '-'} />
              <KeyValue label="측정 시각" value={formatDateTimeKorean(searchedVital.measuredAt)} />
            </View>
            <CurrentVitalsStrip
              items={[
                { label: 'HR', value: `${searchedVital.hr}`, unit: 'bpm', tone: getMetricTone('HR', searchedVital, defaultTargets) },
                { label: 'RR', value: `${searchedVital.rr}`, unit: '/min', tone: getMetricTone('RR', searchedVital, defaultTargets) },
                { label: 'SpO2', value: `${searchedVital.spo2}`, unit: '%', tone: getMetricTone('SpO2', searchedVital, defaultTargets) },
                { label: 'Skin Temp', value: searchedVital.temperature.toFixed(1), unit: '°C', tone: getMetricTone('SkinTemp', searchedVital, defaultTargets) },
              ]}
            />
          </View>

          <AccordionCard title="상세 EMR 정보 보기" badge="Read-only">
            <View style={styles.keyValueList}>
              <KeyValue label="이식혈관외과 세부" value={searchedPatient.transplantSubtype ? transplantSubtypeLabels[searchedPatient.transplantSubtype] : '-'} />
              <KeyValue label="최근 수술명" value={searchedPatientResult?.meta.recentSurgeryName ?? '-'} />
              <KeyValue label="수술시간" value={`${searchedPatientResult?.meta.surgeryDurationMinutes ?? '-'}분`} />
              <KeyValue label="전신마취" value={searchedPatientResult?.meta.generalAnesthesia ? '예' : '아니오'} />
              <KeyValue label="기기 번호" value={searchedPatientResult?.meta.deviceNumber ?? '-'} />
              <KeyValue label="스캐너" value={searchedPatientResult?.meta.scannerId ?? '-'} />
              {searchedHicardiVital ? (
                <KeyValue
                  label="HiCardi 더미 매핑"
                  value={`HR ${searchedHicardiVital.hr} / RR ${searchedHicardiVital.rr} / SpO₂ ${searchedHicardiVital.spo2}`}
                />
              ) : null}
            </View>
          </AccordionCard>
        </SectionCard>
      ) : null}

      {showAssessment && assessmentPatient && news2Result && assessmentDecision ? (
        <>
          <SectionCard title="3. NEWS2 적용 사정" caption="NEWS2 점수와 병동 특수 기준은 분리해 보여줍니다.">
            <View style={styles.news2HeroCard}>
              <Text style={styles.resultTitle}>NEWS2 총점</Text>
              <Text style={styles.news2HeroValue}>{news2Result.totalScore}점</Text>
              <Text style={styles.cardText}>점수 구간: {getNews2BandLabel(news2Result.band)}</Text>
            </View>

            <View style={styles.news2RowsCard}>
              {news2Rows.map((item) => (
                <View key={item.label} style={styles.news2Row}>
                  <Text style={styles.news2RowLabel}>{item.label}</Text>
                  <Text style={styles.news2RowValue}>{item.value}</Text>
                  <Text style={[styles.news2RowScore, item.tone === 'Danger' && styles.textDanger, item.tone === 'Warning' && styles.textWarning]}>
                    {getNews2DisplayScore(item.label, news2Result)}점
                  </Text>
                </View>
              ))}
            </View>

            <SectionCard title="병동 특수 적용 기준" caption="NEWS2 총점에 합산하지 않는 별도 판단 보조 기준입니다.">
              <View style={styles.checkListBlock}>
                {[
                  ['icuOrEr', 'ICU 또는 ER 경유', '입원 전 또는 전동 전 ICU/ER 경유 환자'],
                  ['highRiskSurgeryOrTransplant', '고위험 수술 또는 장기이식 수술', '전신마취 2시간 이상 또는 8A major operation 예시'],
                  ['age65OrOlder', '65세 이상', '입원일 기준 만 65세 이상 환자'],
                ].map(([key, label, description]) => {
                  const selected = specialCriteria[key as keyof HicardiSpecialCriteria];
                  return (
                    <Pressable key={key} style={[styles.checkCard, selected && styles.checkCardActive]} onPress={() => updateSpecialCriterion(key as keyof HicardiSpecialCriteria)}>
                      <View style={[styles.fakeCheck, selected && styles.fakeCheckActive]}>
                        <Text style={styles.fakeCheckText}>{selected ? '✓' : ''}</Text>
                      </View>
                      <View style={styles.flex}>
                        <Text style={styles.cardTitle}>{label}</Text>
                        <Text style={styles.cardText}>{description}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable style={[styles.inlineNoticeCard, emergencyApply && styles.inlineNoticeCardDanger]} onPress={() => setEmergencyApply((current) => !current)}>
                <Text style={styles.cardTitle}>응급상황 시 의료진 상의</Text>
                <Text style={styles.cardText}>응급상황 발생 시 환자 상태를 즉시 확인하고 담당 의료진과 상의하는 시연용 흐름입니다.</Text>
              </Pressable>
            </SectionCard>
          </SectionCard>

          <SectionCard title="4. HiCardi 적용 판단 결과">
            <View style={[styles.resultCardStrong, { borderColor: getDecisionColor(assessmentDecision.decision) }]}>
              <Text style={[styles.resultHeroLabel, { color: getDecisionColor(assessmentDecision.decision) }]}>{assessmentDecision.finalLabel}</Text>
              <Text style={styles.resultHeroPatient}>{assessmentPatient.patient.displayName}</Text>
              <Text style={styles.cardText}>{assessmentDecision.description}</Text>
              <Text style={styles.resultHeroMeta}>다음 재평가: {nextReassessmentLabel}</Text>
              {isDirectStart ? <Text style={styles.resultHeroCallout}>NEWS2 7점 이상으로 담당 의료진과 HiCardi 적용 여부를 즉시 상의하는 흐름이 표시됩니다.</Text> : null}
            </View>

            <AccordionCard title="세부 판단 근거 보기" badge="임시 기준">
              <View style={styles.keyValueList}>
                <KeyValue label="평가일시" value={formatDateTimeKorean(new Date().toISOString())} />
                <KeyValue label="NEWS2 총점" value={`${news2Result.totalScore}점`} />
                <KeyValue label="NEWS2 점수 구간" value={getNews2BandLabel(news2Result.band)} />
                <KeyValue label="병동 특수 기준" value={formatSpecialCriteriaSummary(specialCriteria)} />
                <KeyValue label="추천 상태값" value={assessmentDecision.recommendedStatus} />
              </View>
            </AccordionCard>

            <AccordionCard title="재평가·중단 기준 보기">
              <View style={styles.keyValueList}>
                <KeyValue label="다음 재평가" value={assessmentDecision.nextReassessmentLabel} />
                <KeyValue label="적용·중단 상의" value={getAssessmentDecisionLabel(assessmentDecision.decision)} />
              </View>
            </AccordionCard>

            <View style={styles.actionGrid}>
              <Pressable style={styles.secondaryButton} onPress={saveAsCandidate}>
                <Text style={styles.secondaryButtonText}>적용 상의 대상으로 저장</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={saveAssessmentOnly}>
                <Text style={styles.secondaryButtonText}>평가 기록 저장</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={resetAssessment}>
                <Text style={styles.secondaryButtonText}>초기화</Text>
              </Pressable>
            </View>

            {assessmentRecords.length ? (
              <AccordionCard title={`평가 기록 보기 (${assessmentRecords.length})`} badge="누적">
                <View style={styles.accordionList}>
                  {assessmentRecords.map((record) => (
                    <View key={record.id} style={styles.historyCard}>
                      <Text style={styles.cardTitle}>{formatDateTimeKorean(record.assessedAt)}</Text>
                      <Text style={styles.cardText}>NEWS2 {record.news2Score}점 ({getNews2BandLabel(record.news2Band)})</Text>
                      <Text style={styles.cardText}>판단: {getAssessmentDecisionLabel(record.decision)}</Text>
                      <Text style={styles.cardText}>재평가: {record.nextReassessmentLabel ?? '-'}</Text>
                    </View>
                  ))}
                </View>
              </AccordionCard>
            ) : null}
          </SectionCard>
        </>
      ) : null}

      {showPatientSummary && !assessmentPatient ? (
        <View style={styles.floatingActionWrap}>
          <Pressable style={styles.primaryButton} onPress={startAssessmentForPatient}>
            <Text style={styles.primaryButtonText}>HiCardi 적용 사정 시작하기</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function PatientsScreen({
  patients,
  vitals,
  expandedPatientId,
  activePatientDetailTab,
  toggleExpandedPatient,
  toggleDetailTab,
  isDemoAnomalyMode,
  toggleDemoAnomalyMode,
  patientAlertStates,
  acknowledgePatientAnomaly,
  updatePatientTargets,
  blinkOn,
  reduceMotion,
}: {
  patients: Patient[];
  vitals: Record<string, VitalSign>;
  expandedPatientId: string | null;
  activePatientDetailTab: 'ecg' | 'history' | 'target' | 'record' | null;
  toggleExpandedPatient: (id: string) => void;
  toggleDetailTab: (tab: 'ecg' | 'history' | 'target' | 'record') => void;
  isDemoAnomalyMode: boolean;
  toggleDemoAnomalyMode: (enabled: boolean) => void;
  patientAlertStates: Record<string, PatientAlertState>;
  acknowledgePatientAnomaly: (patientId: string) => void;
  updatePatientTargets: (patientId: string, targets: PatientTargets) => void;
  blinkOn: boolean;
  reduceMotion: boolean;
}) {
  const slots = Array.from({ length: 6 }, (_, index) => patients[index] ?? null);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="적용 환자 현황"
        right={<DemoBadge text="DEMO · 실제 EMR/HiCardi와 연결되지 않음" />}
      />
      <DemoAnomalyToggle enabled={isDemoAnomalyMode} onToggle={toggleDemoAnomalyMode} />
      {isDemoAnomalyMode && (
        <View style={styles.anomalyModeBadge}>
          <Text style={styles.anomalyModeBadgeText}>DEMO ANOMALY MODE · 환자 상태를 확인하세요</Text>
        </View>
      )}
      <SectionCard title="적용 환자 리스트" caption="카드를 눌러 상세 영역을 펼칩니다.">
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
                styles.patientListCard,
                selected && styles.patientListCardActive,
                !patient && styles.emptySlotCard,
              ]}
            >
              <Pressable disabled={!patient} onPress={() => patient && toggleExpandedPatient(patient.id)}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.slotTitle, !patient && styles.emptySlotText]}>Slot {index + 1}</Text>
                  {patient ? <StatusChip label={statusLabels[patient.status]} tone={patient.status === 'checkRequired' ? 'danger' : patient.status === 'caution' ? 'warning' : 'stable'} /> : null}
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
                    <View style={styles.patientCardMetaRow}>
                      <Text style={styles.slotMeta}>{patient.room}{patient.bed ? `-${patient.bed}` : ''}</Text>
                      <Text style={styles.slotMeta}>HiCardi {getHicardiStatusLabel(patient.hicardiStatus)}</Text>
                      <Text style={styles.slotMeta}>연결 {signalLabels[vital?.signalQuality ?? 'good']}</Text>
                      <Text style={styles.slotMeta}>배터리 {patient.battery}%</Text>
                    </View>
                    <CurrentVitalsStrip
                      items={[
                        { label: 'HR', value: `${vital?.hr ?? '-'}`, unit: 'bpm', tone: vital ? getMetricTone('HR', vital, patient.targets) : 'neutral' },
                        { label: 'RR', value: `${vital?.rr ?? '-'}`, unit: '/min', tone: vital ? getMetricTone('RR', vital, patient.targets) : 'neutral' },
                        { label: 'SpO2', value: `${vital?.spo2 ?? '-'}`, unit: '%', tone: vital ? getMetricTone('SpO2', vital, patient.targets) : 'neutral' },
                        { label: 'Skin Temp', value: vital ? vital.temperature.toFixed(1) : '-', unit: '°C', tone: vital ? getMetricTone('SkinTemp', vital, patient.targets) : 'neutral' },
                      ]}
                    />
                  </View>
                ) : (
                  <View style={styles.emptySlotInner}>
                    <Text style={styles.emptySlotText}>비어 있음</Text>
                  </View>
                )}
              </Pressable>

              {patient && selected && vital && (
                <Pressable style={styles.expandedVitalsPanel} onPress={() => toggleExpandedPatient(patient.id)}>
                  <View style={styles.expandedVitalsHeader}>
                    <View style={styles.slideHandle} />
                    <Text style={styles.expandedTitle}>생체정보 상세</Text>
                    <Text style={styles.sectionCaption}>선택 환자: {patient.name}</Text>
                  </View>
                  <View style={styles.expandedSummaryStrip}>
                    <Text style={[styles.expandedSummaryText, abnormalMetrics.includes('HR') && styles.textDanger]}>HR {vital.hr}</Text>
                    <Text style={[styles.expandedSummaryText, abnormalMetrics.includes('RR') && styles.textDanger]}>RR {vital.rr}</Text>
                    <Text style={[styles.expandedSummaryText, abnormalMetrics.includes('SpO2') && styles.textDanger]}>SpO2 {vital.spo2}</Text>
                    <Text style={[styles.expandedSummaryText, abnormalMetrics.includes('SkinTemp') && styles.textDanger]}>Skin {vital.temperature.toFixed(1)}</Text>
                  </View>
                  {hasAnomaly && (shouldShowBlinkingAlert || isAcknowledged) && (
                    <Pressable style={styles.acknowledgePanel} onPress={(event) => event.stopPropagation?.()}>
                      <Text style={styles.acknowledgeText}>
                        {isAcknowledged
                          ? '확인 완료 · 10분 동안 해당 환자의 데모 알림 깜빡임을 중지합니다.'
                          : '개발용 데모 기능입니다. 실제 환자 데이터가 아니며 임상 판단에 사용할 수 없습니다.'}
                      </Text>
                      {shouldShowBlinkingAlert && (
                        <Pressable
                          style={styles.acknowledgeButton}
                          onPress={(event) => {
                            event.stopPropagation?.();
                            acknowledgePatientAnomaly(patient.id);
                          }}
                        >
                          <Text style={styles.acknowledgeButtonText}>확인했습니다</Text>
                        </Pressable>
                      )}
                    </Pressable>
                  )}
                  <Pressable style={styles.detailTabRow} onPress={(event) => event.stopPropagation?.()}>
                    <DetailTabButton label="ECG" active={activePatientDetailTab === 'ecg'} onPress={() => toggleDetailTab('ecg')} />
                    <DetailTabButton label="Vital History" active={activePatientDetailTab === 'history'} onPress={() => toggleDetailTab('history')} />
                    <DetailTabButton label="알림 범위" active={activePatientDetailTab === 'target'} onPress={() => toggleDetailTab('target')} />
                    <DetailTabButton label="적용 기록" active={activePatientDetailTab === 'record'} onPress={() => toggleDetailTab('record')} />
                  </Pressable>
                  {activePatientDetailTab ? (
                    <Pressable
                      style={styles.detailFlatSection}
                      onPress={(event) => {
                        event.stopPropagation?.();
                        toggleDetailTab(activePatientDetailTab);
                      }}
                    >
                      <View style={styles.detailFlatHeader}>
                        <Text style={styles.detailFlatTitle}>{getPatientDetailTabLabel(activePatientDetailTab)}</Text>
                        <Text style={styles.detailFlatHint}>다시 터치하여 접기</Text>
                      </View>
                      <Pressable style={styles.detailFlatBody} onPress={(event) => event.stopPropagation?.()}>
                        {activePatientDetailTab === 'ecg' ? (
                          <PatientVitalsScreen
                            patientName={patient.name}
                            roomBed={`${patient.room}${patient.bed ? `-${patient.bed}` : ''}`}
                            reason={patient.applicationReason || getPatientCategorySummary(patient)}
                          />
                        ) : null}
                        {activePatientDetailTab === 'history' ? <VitalSignsHistoryChart /> : null}
                        {activePatientDetailTab === 'target' ? (
                          <PatientTargetFields targets={patient.targets} setTargets={(targets) => updatePatientTargets(patient.id, targets)} flat />
                        ) : null}
                        {activePatientDetailTab === 'record' ? (
                          <View style={styles.recordFlatList}>
                            <KeyValue label="환자번호" value={patient.patientNumber ?? patient.id} />
                            <KeyValue label="적용 상태" value={getHicardiStatusLabel(patient.hicardiStatus)} />
                            <KeyValue label="의료진 상의 후 적용 시점" value={patient.hicardiStartTime ?? '-'} />
                            <KeyValue label="적용 사유" value={patient.applicationReason || '시연용 등록'} />
                            <KeyValue label="최근 알람" value={patient.latestAlert || '-'} />
                          </View>
                        ) : null}
                      </Pressable>
                    </Pressable>
                  ) : null}
                </Pressable>
              )}
            </View>
          );
        })}
      </SectionCard>
    </View>
  );
}

function PatientTargetFields({
  targets,
  setTargets,
  flat,
}: {
  targets: PatientTargets;
  setTargets: (targets: PatientTargets) => void;
  flat?: boolean;
}) {
  const updateNumber = (key: keyof PatientTargets, value: string) => {
    const numeric = Number(value.replace(/[^0-9.]/g, ''));
    setTargets({ ...targets, [key]: Number.isFinite(numeric) ? numeric : 0 });
  };

  return (
    <View style={[styles.targetCard, flat && styles.targetCardFlat]}>
      <View style={styles.rowBetween}>
        <Text style={styles.targetTitle}>시연용 알림 범위 설정</Text>
        <Badge text="시연용 설정" compact />
      </View>
      <Text style={styles.targetCaption}>알림 범위는 프로토타입 시연용 설정입니다. 실제 임상 기준으로 사용하지 마세요.</Text>
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

function DetailTabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.detailTabButton, active && styles.detailTabButtonActive]} onPress={onPress}>
      <Text style={[styles.detailTabButtonText, active && styles.detailTabButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ManualScreen({
  search,
  setSearch,
  saveSearch,
  searchHistory,
  favorites,
  setFavorites,
  scrollToY,
}: {
  search: string;
  setSearch: (value: string) => void;
  saveSearch: (value: string) => void;
  searchHistory: string[];
  favorites: string[];
  setFavorites: React.Dispatch<React.SetStateAction<string[]>>;
  scrollToY: (y: number) => void;
}) {
  const [openManualId, setOpenManualId] = useState<string | null>('overview');
  const [openFavorites, setOpenFavorites] = useState(false);
  const [manualHasInteracted, setManualHasInteracted] = useState(false);
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>({
    step2: 'pc',
    step4: 'smart-web',
    step5: 'pc',
  });
  const manualPositionsRef = React.useRef<Record<string, number>>({});

  const normalizedSearch = search.trim().toLowerCase();
  const filteredSteps = manualSteps
    .filter((step) => {
      if (!normalizedSearch) return true;
      const haystack = [
        step.title,
        step.summary ?? '',
        ...step.sections.flatMap((section) => [section.title ?? '', ...section.body, section.warning ?? '']),
        ...(step.tabs?.flatMap((tab) => [tab.label, ...tab.body, tab.warning ?? '']) ?? []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  const favoriteSteps = favorites
    .map((favoriteId) => manualSteps.find((step) => step.id === favoriteId))
    .filter((step): step is (typeof manualSteps)[number] => Boolean(step));

  const animateAccordion = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const toggleManual = (id: string) => {
    animateAccordion();
    setManualHasInteracted(true);
    setOpenManualId((prev) => (prev === id ? null : id));
  };

  const toggleFavorites = () => {
    animateAccordion();
    setOpenFavorites((prev) => !prev);
  };

  const handleToggleFavorite = (event: { stopPropagation?: () => void }, stepId: string) => {
    event.stopPropagation?.();
    setFavorites((current) => (current.includes(stepId) ? current.filter((id) => id !== stepId) : [...current, stepId]));
  };

  const handleFavoritePress = (stepId: string) => {
    setManualHasInteracted(true);
    setOpenManualId(stepId);
    setOpenFavorites(false);
    const y = manualPositionsRef.current[stepId];
    if (typeof y === 'number') {
      scrollToY(Math.max(0, y - 140));
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="HiCardi 퀵 매뉴얼"
      />
      <SectionCard title="매뉴얼 검색">
        <Field
          value={search}
          onChangeText={setSearch}
          onBlur={() => saveSearch(search)}
          placeholder="준비, 매핑, 라이브스튜디오, 종료"
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
      </SectionCard>

      <AccordionCard title={`즐겨찾기 (${favoriteSteps.length})`} expanded={openFavorites} onToggle={toggleFavorites}>
        {favoriteSteps.length ? (
          favoriteSteps.map((step) => (
            <Pressable
              key={step.id}
              style={styles.favoriteLinkCard}
              onPress={(event) => {
                event.stopPropagation?.();
                handleFavoritePress(step.id);
              }}
            >
              <View style={styles.flex}>
                <Text style={styles.favoriteLinkTitle}>{step.title}</Text>
                <Text style={styles.favoriteLinkText}>{step.summary}</Text>
              </View>
              <Text style={styles.favoriteLinkChevron}>›</Text>
            </Pressable>
          ))
        ) : (
          <View style={styles.favoriteEmptyCard}>
            <Text style={styles.favoriteEmptyStar}>☆</Text>
            <Text style={styles.favoriteEmptyTitle}>아직 즐겨찾기한 매뉴얼이 없습니다.</Text>
            <Text style={styles.favoriteEmptyText}>자주 확인하는 단계의 별표를 눌러 추가해보세요.</Text>
          </View>
        )}
      </AccordionCard>

      <SectionCard title="단계별 실무 매뉴얼" caption="제목만 먼저 보이고, 누르면 내용이 펼쳐집니다.">
        {filteredSteps.map((step, index) => {
          const expanded = manualHasInteracted ? openManualId === step.id : false;
          const favorite = favorites.includes(step.id);
          return (
            <AccordionCard
              key={step.id}
              title={step.title}
              summary={step.summary}
              badge={favorite ? '★' : undefined}
              expanded={expanded}
              onToggle={() => toggleManual(step.id)}
              onLayout={(event) => {
                manualPositionsRef.current[step.id] = event.nativeEvent.layout.y;
              }}
            >
              <View style={styles.manualAccordionHeaderRow}>
                <View style={styles.manualStepBadge}>
                  <Text style={styles.manualStepBadgeText}>{index + 1}</Text>
                </View>
                <Pressable
                  style={[styles.favoriteButton, favorite && styles.favoriteButtonActive]}
                  onPress={(event) => handleToggleFavorite(event, step.id)}
                >
                  <Text style={styles.favoriteText}>{favorite ? '★' : '☆'}</Text>
                </Pressable>
              </View>
              {step.id === 'overview' ? <ManualOverviewStepper /> : null}
              {step.sections.map((section, sectionIndex) => (
                <ManualSectionBlock key={`${step.id}-${section.title ?? sectionIndex}`} section={section} />
              ))}
              {step.tabs ? (
                <ManualTabbedBlock
                  stepId={step.id}
                  tabs={step.tabs}
                  activeTabId={activeTabs[step.id] ?? step.tabs[0]?.id}
                  onChangeTab={(tabId) => setActiveTabs((current) => ({ ...current, [step.id]: tabId }))}
                />
              ) : null}
            </AccordionCard>
          );
        })}
      </SectionCard>
    </View>
  );
}

function ManualOverviewStepper() {
  const flow = [
    'Step 1. 솔루션 및 의료기기 준비',
    'Step 2. 환자·의료기기·수신기 매핑',
    'Step 3. 환자에게 의료기기 적용',
    'Step 4. 생체정보 실시간 관찰',
    'Step 5. 의료진 상의 후 매핑 해제 및 모니터링 종료',
  ];

  return (
    <View style={styles.manualFlowCard}>
      {flow.map((item, index) => (
        <View key={item} style={styles.manualFlowItem}>
          <View style={styles.manualFlowBadge}>
            <Text style={styles.manualFlowBadgeText}>{index + 1}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.manualFlowText}>{item}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function ManualSectionBlock({ section }: { section: ManualStepSection }) {
  return (
    <View style={styles.manualContentCard}>
      {section.title ? <Text style={styles.manualContentTitle}>{section.title}</Text> : null}
      <View style={styles.manualBulletList}>
        {section.body.map((item) => (
          <Text key={item} style={styles.manualBulletText}>
            {item}
          </Text>
        ))}
      </View>
      <ManualImageBlock imageKey={section.image} />
      {section.warning ? (
        <View style={styles.manualWarningBox}>
          <Text style={styles.manualWarningTitle}>주의</Text>
          <Text style={styles.manualWarningText}>{section.warning}</Text>
        </View>
      ) : null}
    </View>
  );
}

function ManualTabbedBlock({
  stepId,
  tabs,
  activeTabId,
  onChangeTab,
}: {
  stepId: string;
  tabs: ManualTabContent[];
  activeTabId: string;
  onChangeTab: (tabId: string) => void;
}) {
  const activeTab = tabs.find((item) => item.id === activeTabId) ?? tabs[0];

  return (
    <View style={styles.manualContentCard}>
      <View style={styles.manualTabsRow}>
        {tabs.map((tab) => (
          <Pressable
            key={`${stepId}-${tab.id}`}
            style={[styles.manualTabButton, tab.id === activeTab.id && styles.manualTabButtonActive]}
            onPress={(event) => {
              event.stopPropagation?.();
              onChangeTab(tab.id);
            }}
          >
            <Text style={[styles.manualTabButtonText, tab.id === activeTab.id && styles.manualTabButtonTextActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.manualBulletList}>
        {activeTab.body.map((item) => (
          <Text key={`${activeTab.id}-${item}`} style={styles.manualBulletText}>
            {item}
          </Text>
        ))}
      </View>
      <ManualImageBlock imageKey={activeTab.image} />
      {activeTab.warning ? (
        <View style={styles.manualWarningBox}>
          <Text style={styles.manualWarningTitle}>안내</Text>
          <Text style={styles.manualWarningText}>{activeTab.warning}</Text>
        </View>
      ) : null}
    </View>
  );
}

function ManualImageBlock({ imageKey }: { imageKey?: ManualImageKey }) {
  if (!imageKey) return null;
  const source = manualImageAssets[imageKey];
  if (!source) return null;

  return <Image source={source} style={styles.manualImage} resizeMode="contain" />;
}

function QaScreen({
  search,
  setSearch,
}: {
  search: string;
  setSearch: (value: string) => void;
}) {
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const [qrLoadFailed, setQrLoadFailed] = useState(false);
  const filtered = faqItems.filter((item) =>
    `${item.question} ${item.answer}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const toggleFaq = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenFaqId((prev) => (prev === id ? null : id));
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="FAQ"
      />
      <SectionCard title="">
        <Text style={styles.contactCardTitle}>People & Technology 고객센터</Text>
        <View style={styles.contactCardRow}>
          <View style={styles.flex}>
            <View style={styles.contactInfoList}>
              <View style={styles.contactInfoRow}>
                <Text style={styles.contactInfoLabel}>고객센터</Text>
                <Text style={styles.contactInfoValue}>010-2280-3601</Text>
              </View>
              <View style={styles.contactInfoRow}>
                <Text style={styles.contactInfoLabel}>문의 가능 시간</Text>
                <Text style={styles.contactInfoValue}>09:00 ~ 18:00</Text>
              </View>
            </View>
          </View>
          <View style={styles.contactQrBlock}>
            {!qrLoadFailed ? (
              <Image
                source={require('./assets/contact/pnt-kakao-qr.png')}
                style={styles.contactQrImage}
                resizeMode="contain"
                onError={() => setQrLoadFailed(true)}
              />
            ) : (
              <View style={styles.contactQrFallback}>
                <Text style={styles.contactQrFallbackText}>카카오톡 QR 이미지 준비 중</Text>
              </View>
            )}
            <Text style={styles.contactQrLabel}>카카오톡 문의</Text>
          </View>
        </View>
      </SectionCard>
      <SectionCard title="FAQ 검색">
        <Field value={search} onChangeText={setSearch} placeholder="병실, 검사실, 라이브스튜디오, EMR, 알람, QR" />
      </SectionCard>
      <SectionCard title="자주 묻는 질문">
        {filtered
          .sort((a, b) => getFaqPriority(a.question) - getFaqPriority(b.question))
          .map((item) => {
          const expanded = openFaqId === item.id;
          return (
            <AccordionCard key={item.id} title={item.question} expanded={expanded} onToggle={() => toggleFaq(item.id)}>
              <Text style={styles.faqAnswerText}>A. {item.answer}</Text>
            </AccordionCard>
          );
        })}
      </SectionCard>
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

function BottomTabs({
  active,
  setActive,
  tabBarStyle,
}: {
  active: Tab;
  setActive: (tab: Tab) => void;
  tabBarStyle: StyleProp<ViewStyle>;
}) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'criteria', label: '적용 평가' },
    { id: 'patients', label: '환자 현황' },
    { id: 'manual', label: '매뉴얼' },
    { id: 'qa', label: 'FAQ' },
  ];
  return (
    <View style={tabBarStyle}>
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
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric';
}) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
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

function ScreenHeader({
  title,
  description,
  right,
}: {
  title: string;
  description?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.screenHeader}>
      <View style={styles.flex}>
        <Text style={styles.screenTitle}>{title}</Text>
        {description ? <Text style={styles.screenDescription}>{description}</Text> : null}
      </View>
      {right}
    </View>
  );
}

function DemoBadge({ text }: { text: string }) {
  return (
    <View style={styles.demoBadge}>
      <Text style={styles.demoBadgeText}>{text}</Text>
    </View>
  );
}

function SectionCard({ title, caption, children }: { title: string; caption?: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
      {children}
    </View>
  );
}

function AccordionCard({
  title,
  summary,
  badge,
  children,
  expanded: controlledExpanded,
  onToggle,
  onLayout,
}: {
  title: string;
  summary?: string;
  badge?: string;
  children: React.ReactNode;
  expanded?: boolean;
  onToggle?: () => void;
  onLayout?: (event: any) => void;
}) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = controlledExpanded ?? internalExpanded;

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (onToggle) {
      onToggle();
      return;
    }
    setInternalExpanded((current) => !current);
  };

  return (
    <View style={[styles.accordionCard, expanded && styles.accordionCardActive]} onLayout={onLayout}>
      <Pressable style={styles.accordionHeader} onPress={handleToggle}>
        <View style={styles.flex}>
          <View style={styles.accordionTitleRow}>
            <Text style={styles.accordionTitle}>{title}</Text>
            {badge ? <StatusChip label={badge} tone="neutral" /> : null}
          </View>
          {summary ? <Text style={styles.accordionSummary}>{summary}</Text> : null}
        </View>
        <View style={styles.accordionRight}>
          {expanded ? <Text style={styles.accordionCollapseHint}>다시 터치하여 접기</Text> : null}
          <Text style={styles.manualAccordionChevron}>{expanded ? '⌃' : '⌄'}</Text>
        </View>
      </Pressable>
      {expanded ? (
        <Pressable style={styles.accordionBody} onPress={handleToggle}>
          <Pressable style={styles.accordionBodyInner} onPress={(event) => event.stopPropagation?.()}>
            {children}
          </Pressable>
        </Pressable>
      ) : null}
    </View>
  );
}

function StepProgress({ currentStep, steps }: { currentStep: number; steps: string[] }) {
  return (
    <View style={styles.stepProgressWrap}>
      {steps.map((step, index) => {
        const isActive = index + 1 <= currentStep;
        return (
          <React.Fragment key={step}>
            <View style={styles.stepItem}>
              <View style={[styles.stepCircle, isActive && styles.stepCircleActive]}>
                <Text style={[styles.stepCircleText, isActive && styles.stepCircleTextActive]}>{index + 1}</Text>
              </View>
              <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>{step}</Text>
            </View>
            {index < steps.length - 1 ? <View style={[styles.stepLine, index + 1 < currentStep && styles.stepLineActive]} /> : null}
          </React.Fragment>
        );
      })}
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

function StatusChip({ label, tone }: { label: string; tone: 'stable' | 'warning' | 'danger' | 'neutral' }) {
  return (
    <View
      style={[
        styles.statusPill,
        tone === 'stable' && styles.statusStable,
        tone === 'warning' && styles.statusCaution,
        tone === 'danger' && styles.statusDanger,
        tone === 'neutral' && styles.statusNeutral,
      ]}
    >
      <Text style={[styles.statusText, (tone === 'warning' || tone === 'neutral') && styles.statusTextDark]}>{label}</Text>
    </View>
  );
}

function CurrentVitalsStrip({
  items,
}: {
  items: { label: string; value: string; unit: string; tone: 'stable' | 'warning' | 'danger' | 'neutral' }[];
}) {
  return (
    <View style={styles.currentVitalsStrip}>
      {items.map((item) => (
        <View key={item.label} style={styles.currentVitalsItem}>
          <Text style={styles.currentVitalsLabel}>{item.label}</Text>
          <Text style={[styles.currentVitalsValue, item.tone === 'danger' && styles.textDanger, item.tone === 'warning' && styles.textWarning]}>
            {item.value}
          </Text>
          <Text style={styles.currentVitalsUnit}>{item.unit}</Text>
        </View>
      ))}
    </View>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.keyValueRow}>
      <Text style={styles.keyValueLabel}>{label}</Text>
      <Text style={styles.keyValueValue}>{value}</Text>
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
      title: '적용 상의 필요',
      color: theme.danger,
      reason: '6점 이상은 시연용 임시 기준에서 HiCardi 적용 여부를 담당 의료진과 상의할 필요가 있는 범위입니다. 실제 적용 여부는 병동 프로토콜과 의료진 판단에 따릅니다.',
    };
  }
  if (totalScore >= 3) {
    return {
      title: '적용 여부 상의',
      color: theme.caution,
      reason: '3-5점은 시연용 임시 기준에서 적용 여부를 상의하는 참고 범위입니다. 단독 의료 판단 기준이 아닙니다.',
    };
  }
  return {
    title: '일반 관찰',
    color: theme.stable,
    reason: '0-2점은 시연용 임시 기준에서 일반 관찰 범위입니다. 실제 상태 변화가 있으면 담당 의료진과 상의합니다.',
  };
}

function getIndicationFromPatient(departmentCategory: DepartmentCategory, transplantSubtype?: TransplantSubtype): HicardiIndication {
  if (departmentCategory !== 'transplantVascularSurgery') return 'icuTransfer';
  if (transplantSubtype === 'kidney') return 'kidneyTransplant';
  if (transplantSubtype === 'liver') return 'liverTransplant';
  return 'icuTransfer';
}

function getPatientCategorySummary(patient: Patient) {
  const category = departmentCategoryLabels[patient.departmentCategory];
  if (patient.departmentCategory === 'transplantVascularSurgery' && patient.transplantSubtype) {
    return `${category} · ${transplantSubtypeLabels[patient.transplantSubtype]}`;
  }
  return category;
}

function getHicardiStatusLabel(status: Patient['hicardiStatus']) {
  if (status === 'applied') return '적용 중';
  if (status === 'candidate') return '적용 상의 대상';
  if (status === 'ended') return '중단 여부 상의 완료';
  return '미적용';
}

function getAssessmentStatusLabel(
  status: AppPatient['currentHicardiStatus'] | HicardiAssessmentRecord['status'],
) {
  if (status === 'candidate') return '적용 상의 대상';
  if (status === 'mappingPending') return '의료진 상의 후 매핑 대기';
  if (status === 'monitoring') return '모니터링 중';
  if (status === 'maintained') return '일반 관찰 유지';
  if (status === 'ended') return '중단 여부 상의';
  return '미적용';
}

function getAssessmentDecisionLabel(decision: HicardiAssessmentRecord['decision']) {
  if (decision === 'startHicardi') return 'HiCardi 적용 상의 필요';
  if (decision === 'recommendHicardi') return 'HiCardi 적용 상의 권고';
  if (decision === 'consultSenior') return '상급자 및 의료진 상의';
  if (decision === 'considerStop') return 'HiCardi 중단 여부 상의';
  if (decision === 'emergencyApply') return '즉시 의료진 상의 필요';
  return '일반 관찰 유지';
}

function getDecisionColor(decision: HicardiAssessmentRecord['decision']) {
  if (decision === 'startHicardi' || decision === 'emergencyApply') return theme.danger;
  if (decision === 'recommendHicardi' || decision === 'consultSenior') return theme.caution;
  if (decision === 'considerStop') return '#7A4A00';
  return theme.stable;
}

function getNews2BandLabel(band: News2Band) {
  if (band === 'gte7') return '7점 이상';
  if (band === 'fiveToSix') return '5-6점';
  if (band === 'oneToFour') return '1-4점';
  return '4점 미만';
}

function countSpecialCriteria(criteria: HicardiSpecialCriteria) {
  return Object.values(criteria).filter(Boolean).length;
}

function formatSpecialCriteriaSummary(criteria: HicardiSpecialCriteria) {
  const labels = [];
  if (criteria.icuOrEr) labels.push('ICU/ER 경유');
  if (criteria.highRiskSurgeryOrTransplant) labels.push('고위험 수술 또는 장기이식 수술');
  if (criteria.age65OrOlder) labels.push('65세 이상');
  return labels.length ? labels.join(', ') : '해당 없음';
}

function formatDateTimeKorean(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPopupConsciousness(value: VitalSnapshot['consciousness']) {
  return value === 'alert' ? 'Alert' : 'New confusion / AVPU';
}

function getPopupVitalTone(
  key: 'rr' | 'spo2' | 'oxygen' | 'sbp' | 'hr' | 'consciousness' | 'temperature',
  vital: VitalSnapshot,
): 'Normal' | 'Warning' | 'Danger' {
  if (key === 'spo2') {
    if (vital.spo2 < 94) return 'Danger';
    if (vital.spo2 < 96) return 'Warning';
    return 'Normal';
  }
  if (key === 'rr') {
    if (vital.rr >= 25 || vital.rr <= 8) return 'Danger';
    if (vital.rr >= 21 || vital.rr <= 11) return 'Warning';
    return 'Normal';
  }
  if (key === 'sbp') {
    if (vital.sbp <= 90 || vital.sbp >= 220) return 'Danger';
    if (vital.sbp <= 110) return 'Warning';
    return 'Normal';
  }
  if (key === 'hr') {
    if (vital.hr <= 40 || vital.hr >= 131) return 'Danger';
    if (vital.hr <= 50 || vital.hr >= 111) return 'Warning';
    return 'Normal';
  }
  if (key === 'temperature') {
    if (vital.temperature <= 35.0 || vital.temperature >= 39.1) return 'Danger';
    if (vital.temperature <= 36.0 || vital.temperature >= 38.1) return 'Warning';
    return 'Normal';
  }
  if (key === 'consciousness') {
    return vital.consciousness === 'alert' ? 'Normal' : 'Danger';
  }
  if (key === 'oxygen') {
    return vital.oxygen ? 'Warning' : 'Normal';
  }
  return 'Normal';
}

function getPopupVitalItems(vital: VitalSnapshot) {
  return [
    { label: 'RR', value: `${vital.rr}회/분`, tone: getPopupVitalTone('rr', vital) },
    { label: 'SpO₂', value: `${vital.spo2}%`, tone: getPopupVitalTone('spo2', vital) },
    { label: '산소투여', value: vital.oxygen ? '예' : '아니오', tone: getPopupVitalTone('oxygen', vital) },
    { label: 'SBP', value: `${vital.sbp} mmHg`, tone: getPopupVitalTone('sbp', vital) },
    { label: 'HR', value: `${vital.hr}회/분`, tone: getPopupVitalTone('hr', vital) },
    { label: '의식상태', value: formatPopupConsciousness(vital.consciousness), tone: getPopupVitalTone('consciousness', vital) },
    { label: '체온', value: `${vital.temperature.toFixed(1)}℃`, tone: getPopupVitalTone('temperature', vital) },
  ] as const;
}

function getPopupVitalToneStyle(tone: 'Normal' | 'Warning' | 'Danger') {
  if (tone === 'Warning') return styles.vitalBadgeWarning;
  if (tone === 'Danger') return styles.vitalBadgeDanger;
  return styles.vitalBadgeNormal;
}

function getMetricTone(
  metric: VitalMetricName,
  vital: Pick<VitalSign, 'hr' | 'rr' | 'spo2' | 'temperature'>,
  targets: PatientTargets,
): 'stable' | 'warning' | 'danger' | 'neutral' {
  if (metric === 'HR') {
    if (vital.hr < 50 || vital.hr > 120) return 'danger';
    if (vital.hr < targets.hrMin || vital.hr > targets.hrMax) return 'warning';
    return 'stable';
  }
  if (metric === 'RR') {
    if (vital.rr > 24 || vital.rr < 10) return 'danger';
    if (vital.rr < targets.rrMin || vital.rr > targets.rrMax) return 'warning';
    return 'stable';
  }
  if (metric === 'SpO2') {
    if (vital.spo2 < 94) return 'danger';
    if (vital.spo2 < targets.spo2Min) return 'warning';
    return 'stable';
  }
  if (vital.temperature < 35.5 || vital.temperature > 38.0) return 'danger';
  if (vital.temperature < targets.skinTempMin || vital.temperature > targets.skinTempMax) return 'warning';
  return 'stable';
}

function getNews2DisplayScore(label: string, result: News2Result) {
  if (label === 'RR') return result.itemScores.rr;
  if (label === 'SpO₂') return result.itemScores.spo2;
  if (label === '산소투여') return result.itemScores.oxygen;
  if (label === 'SBP') return result.itemScores.sbp;
  if (label === 'HR') return result.itemScores.pulse;
  if (label === '의식상태') return result.itemScores.consciousness;
  if (label === '체온') return result.itemScores.temperature;
  return 0;
}

function getPatientDetailTabLabel(tab: 'ecg' | 'history' | 'target' | 'record') {
  if (tab === 'ecg') return 'ECG';
  if (tab === 'history') return 'Vital History';
  if (tab === 'target') return '알림 범위';
  return '적용 기록';
}

function getFaqPriority(question: string) {
  const priorities = [
    'ECG 그래프가 보이지 않아요',
    '환자 목록에 나타나지 않아요',
    '알람이 계속 떠요',
    '검사실 이동 시',
  ];
  const index = priorities.findIndex((item) => question.includes(item));
  return index === -1 ? priorities.length + 1 : index;
}

function getDefaultSpecialCriteria(patient: AppPatient, meta: DemoSearchResult['meta']): HicardiSpecialCriteria {
  const surgeryName = `${meta.recentSurgeryName}`.toUpperCase();
  const isHighRiskOperation =
    meta.surgeryDurationMinutes >= 120 ||
    ['TLTG', 'PPPD', 'PRPD', 'AAA', 'COLECTOMY', 'KT', 'LT'].some((keyword) => surgeryName.includes(keyword));
  return {
    icuOrEr: patient.transferSource === 'ICU' || patient.transferSource === 'ER' || patient.transferSource === '타과 ICU',
    highRiskSurgeryOrTransplant: isHighRiskOperation || patient.departmentCategory === '이식혈관외과',
    age65OrOlder: (patient.age ?? 0) >= 65,
  };
}

function buildAssessmentReasonSummary(
  patient: AppPatient,
  news2Result: News2Result,
  specialCriteria: HicardiSpecialCriteria,
  finalLabel: string,
  emergencyApply: boolean,
  suffix?: string,
) {
  const base = `${patient.displayName}(${patient.patientNumber})은/는 NEWS2 ${news2Result.totalScore}점(${getNews2BandLabel(news2Result.band)})이며, 병동 특수 적용 기준은 ${formatSpecialCriteriaSummary(specialCriteria)}입니다. 시연용 평가 결과는 ${finalLabel}입니다.`;
  const emergency = emergencyApply ? ' 응급상황 발생 시 즉시 담당 의료진과 상의하는 흐름이 함께 표시되었습니다.' : '';
  return `${base}${emergency}${suffix ? ` ${suffix}` : ''}`.trim();
}

function mapAssessmentStatusToLegacyStatus(status: HicardiAssessmentRecord['status']): Patient['hicardiStatus'] {
  if (status === 'monitoring') return 'applied';
  if (status === 'ended') return 'ended';
  if (status === 'candidate' || status === 'mappingPending' || status === 'maintained') return 'candidate';
  return 'notApplied';
}

function mapDepartmentLabelToLegacyCategory(label: AppPatient['departmentCategory']): DepartmentCategory {
  if (label === '이식혈관외과') return 'transplantVascularSurgery';
  if (label === '소아외과') return 'pediatricSurgery';
  if (label === '간담췌외과') return 'hepatobiliaryPancreaticSurgery';
  if (label === '위장관 외과') return 'gastrointestinalSurgery';
  if (label === '내분비 외과') return 'endocrineSurgery';
  return 'icuTransferOther';
}

function mapTransferLabelToLegacySource(label?: AppPatient['transferSource']): TransferSource {
  if (label === '수술실') return 'operatingRoom';
  if (label === 'ICU') return 'icu';
  if (label === '타과 ICU') return 'otherDepartmentIcu';
  if (label === '병동 입원') return 'ward';
  return 'other';
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

function createVital(patientId: string, hr: number, rr: number, spo2: number, temperature: number, signalQuality: SignalQuality): VitalSign {
  return createPatientVitalSnapshot(patientId, hr, rr, spo2, temperature, signalQuality);
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
    paddingHorizontal: 20,
    paddingBottom: 16,
    minHeight: 76,
    justifyContent: 'center',
    backgroundColor: theme.primary,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  headerSubtitle: {
    color: '#DCECF5',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 19,
    marginTop: 3,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  content: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  screen: {
    gap: 12,
  },
  section: {
    gap: 12,
  },
  screenHeader: {
    gap: 8,
  },
  screenTitle: {
    color: theme.primary,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  screenDescription: {
    color: theme.muted,
    fontSize: 14,
    lineHeight: 21,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  demoBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: theme.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  demoBadgeText: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  sectionCard: {
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    padding: 16,
  },
  sectionTitle: {
    color: theme.text,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 24,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  sectionCaption: {
    color: theme.muted,
    fontSize: 14,
    lineHeight: 21,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  accordionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: '#FCFEFF',
    overflow: 'hidden',
  },
  accordionCardActive: {
    borderColor: '#B8D3E5',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  accordionRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  accordionCollapseHint: {
    color: theme.muted,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  accordionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  accordionTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  accordionSummary: {
    color: theme.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  accordionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  accordionBodyInner: {
    gap: 12,
  },
  stepProgressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    padding: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#B7C8D5',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  stepCircleActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  stepCircleText: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  stepCircleTextActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  stepLabelActive: {
    color: theme.primary,
  },
  stepLine: {
    width: 12,
    height: 1,
    backgroundColor: '#C9D8E2',
  },
  stepLineActive: {
    backgroundColor: theme.primary,
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
    lineHeight: 18,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  helperText: {
    color: theme.muted,
    fontSize: 12,
    lineHeight: 18,
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
    lineHeight: 22,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  cardText: {
    color: theme.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  currentVitalsStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currentVitalsItem: {
    minWidth: 84,
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#F7FBFD',
    padding: 12,
    gap: 2,
  },
  currentVitalsLabel: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  currentVitalsValue: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  currentVitalsUnit: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  keyValueList: {
    gap: 10,
  },
  keyValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  keyValueLabel: {
    width: 96,
    color: theme.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    flexShrink: 1,
    flexWrap: 'wrap',
    ...webTextWrapStyle,
  },
  keyValueValue: {
    flex: 1,
    color: theme.text,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'right',
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  contactCardTitle: {
    color: theme.text,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
  },
  contactCardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 16,
  },
  contactInfoList: {
    gap: 14,
  },
  contactInfoRow: {
    gap: 4,
  },
  contactInfoLabel: {
    color: theme.muted,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  contactInfoValue: {
    color: theme.text,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 23,
  },
  contactQrBlock: {
    width: 132,
    alignItems: 'center',
    gap: 8,
  },
  contactQrImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#F7FBFD',
  },
  contactQrFallback: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: '#F7FBFD',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  contactQrFallbackText: {
    color: theme.muted,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    textAlign: 'center',
  },
  contactQrLabel: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '800',
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
    shadowColor: '#12324A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  criteriaScreen: {
    paddingBottom: 84,
  },
  criteriaSearchBlock: {
    gap: 12,
  },
  searchButtonLarge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: theme.secondary,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  searchButton: {
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: theme.secondary,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  gridTwo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  toggleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  toggleCard: {
    flex: 1,
    minWidth: 220,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    padding: 12,
    gap: 4,
  },
  toggleCardActive: {
    borderColor: theme.secondary,
    backgroundColor: theme.secondarySoft,
  },
  toggleCardDanger: {
    borderColor: theme.danger,
    backgroundColor: '#FFF1F1',
  },
  segmentWrapper: {
    gap: 8,
  },
  news2ScoreCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B8D3E5',
    backgroundColor: theme.primarySoft,
    padding: 12,
    gap: 4,
  },
  news2HeroCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#B8D3E5',
    backgroundColor: '#F4FAFD',
    padding: 16,
    gap: 8,
    shadowColor: '#12324A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  summaryHeroCard: {
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCE8EF',
    backgroundColor: '#FCFEFF',
    padding: 16,
  },
  summaryHeroTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  summaryHeroMeta: {
    color: theme.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  summaryInfoGrid: {
    gap: 8,
  },
  news2HeroValue: {
    color: theme.primary,
    fontSize: 36,
    fontWeight: '900',
  },
  news2RowsCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: '#FCFEFF',
    padding: 16,
    gap: 10,
  },
  news2Row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  news2RowLabel: {
    flex: 1,
    color: theme.text,
    fontSize: 14,
    fontWeight: '700',
  },
  news2RowValue: {
    width: 90,
    color: theme.text,
    fontSize: 14,
    textAlign: 'right',
  },
  news2RowScore: {
    width: 42,
    color: theme.primary,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'right',
  },
  checkListBlock: {
    gap: 10,
  },
  inlineNoticeCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6E2E8',
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 4,
  },
  inlineNoticeCardDanger: {
    borderColor: '#F4B0B0',
    backgroundColor: '#FFF3F3',
  },
  simpleListCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    padding: 12,
    gap: 8,
  },
  resultCardStrong: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.primary,
    backgroundColor: theme.card,
    padding: 14,
    gap: 5,
    shadowColor: '#12324A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  resultHeroLabel: {
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  resultHeroPatient: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '800',
  },
  resultHeroMeta: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '700',
  },
  resultHeroCallout: {
    color: theme.danger,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  accordionList: {
    gap: 10,
  },
  startNowCard: {
    borderRadius: 14,
    backgroundColor: '#FFF3F3',
    borderWidth: 1,
    borderColor: '#F3C4C4',
    paddingVertical: 24,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startNowTitle: {
    color: theme.danger,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  reassessmentCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#B8D3E5',
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 18,
    shadowColor: '#12324A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  reassessmentValue: {
    color: theme.text,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 30,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  floatingActionWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 8,
    backgroundColor: 'rgba(244,248,250,0.96)',
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
  historyCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    padding: 12,
    gap: 4,
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
    lineHeight: 18,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  patientListCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    padding: 16,
    gap: 10,
  },
  patientListCardActive: {
    borderColor: '#B8D3E5',
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
    lineHeight: 18,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  slotInfo: {
    marginTop: 8,
    gap: 3,
  },
  patientCardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
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
    lineHeight: 24,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
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
    lineHeight: 16,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  inlineAckBadgeText: {
    color: theme.text,
  },
  slotMeta: {
    color: theme.muted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
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
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 16,
    gap: 12,
  },
  expandedVitalsHeader: {
    gap: 6,
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
    lineHeight: 24,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  targetCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: '#FCFEFF',
    padding: 16,
    gap: 10,
    shadowColor: '#12324A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  targetCardFlat: {
    borderRadius: 12,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFBFC',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  targetTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  targetCaption: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
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
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  expandedSummaryStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 4,
  },
  expandedSummaryText: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusNeutral: {
    backgroundColor: '#EAF3F9',
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
    lineHeight: 18,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  statusTextDark: {
    color: theme.text,
  },
  textDanger: {
    color: theme.danger,
  },
  textWarning: {
    color: theme.caution,
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
    lineHeight: 18,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
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
    lineHeight: 18,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
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
    backgroundColor: '#FFF7F7',
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
  detailTabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailTabButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D6E2E8',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  detailTabButtonActive: {
    borderColor: '#1E5B8C',
    backgroundColor: '#EAF3F9',
  },
  detailTabButtonText: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  detailTabButtonTextActive: {
    color: '#1E5B8C',
  },
  detailFlatSection: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    gap: 10,
  },
  detailFlatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailFlatTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
    flexShrink: 1,
  },
  detailFlatHint: {
    color: theme.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  detailFlatBody: {
    gap: 10,
  },
  recordFlatList: {
    gap: 8,
    borderRadius: 12,
    backgroundColor: '#FAFBFC',
    padding: 12,
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
  manualAccordionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    padding: 14,
    gap: 12,
    shadowColor: '#12324A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  manualAccordionCardActive: {
    borderColor: '#8BC6D7',
    backgroundColor: '#F9FDFD',
  },
  manualAccordionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  manualAccordionHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  manualAccordionTitle: {
    color: theme.text,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 24,
  },
  manualAccordionSummary: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  manualAccordionChevron: {
    color: theme.primary,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: 2,
  },
  manualAccordionBody: {
    gap: 12,
  },
  manualStepBadge: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: theme.primarySoft,
    borderWidth: 1,
    borderColor: '#B8D3E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  manualStepBadgeText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  manualFlowCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCE9EF',
    backgroundColor: '#F9FCFD',
    padding: 14,
    gap: 10,
  },
  manualFlowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  manualFlowBadge: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualFlowBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  manualFlowText: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  manualContentCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCE9EF',
    backgroundColor: '#FCFEFF',
    padding: 16,
    gap: 10,
  },
  manualContentTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 21,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  manualBulletList: {
    gap: 8,
  },
  manualBulletText: {
    color: theme.text,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  manualTabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  manualTabButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#B8D3E5',
    backgroundColor: theme.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  manualTabButtonActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  manualTabButtonText: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  manualTabButtonTextActive: {
    color: '#FFFFFF',
  },
  manualImage: {
    width: '100%',
    maxHeight: 300,
    minHeight: 180,
    borderRadius: 12,
    backgroundColor: '#F4F8FA',
    alignSelf: 'center',
  },
  manualWarningBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3D189',
    backgroundColor: '#FFF8E8',
    padding: 12,
    gap: 6,
  },
  manualWarningTitle: {
    color: '#8A5A00',
    fontSize: 14,
    fontWeight: '900',
  },
  manualWarningText: {
    color: '#7A6131',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  favoriteSummaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D8E9D7',
    backgroundColor: '#F6FCF7',
    padding: 14,
    gap: 12,
    shadowColor: '#12324A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  favoriteSummaryCardActive: {
    borderColor: '#BFD8A6',
    backgroundColor: '#FBFDEA',
  },
  favoriteSummaryPressable: {
    flex: 1,
  },
  favoriteSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  favoriteSummaryTitle: {
    color: theme.text,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 24,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  favoriteSummaryText: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  favoriteSummaryBody: {
    gap: 10,
  },
  favoriteLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E6ECD2',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  favoriteLinkTitle: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 20,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  favoriteLinkText: {
    color: theme.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  favoriteLinkChevron: {
    color: theme.primary,
    fontSize: 24,
    fontWeight: '700',
  },
  favoriteEmptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E0A7',
    backgroundColor: '#FFFBEA',
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  favoriteEmptyStar: {
    color: '#D4A72C',
    fontSize: 22,
    fontWeight: '900',
  },
  favoriteEmptyTitle: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 20,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  favoriteEmptyText: {
    color: theme.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  searchHistoryWrap: {
    gap: 8,
  },
  searchHistoryLabel: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
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
    lineHeight: 18,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
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
  faqCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    shadowColor: '#12324A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  faqCardActive: {
    borderColor: '#8BC6D7',
    backgroundColor: '#F9FDFD',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  faqQuestionText: {
    flex: 1,
    color: theme.text,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 22,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  faqAnswerText: {
    color: theme.muted,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  faqAnswerWrap: {
    paddingTop: 2,
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
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
    ...webTextWrapStyle,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    maxHeight: '88%',
    borderRadius: 18,
    backgroundColor: theme.card,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  modalTitle: {
    color: theme.text,
    fontSize: 20,
    fontWeight: '900',
  },
  modalClose: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  modalScroll: {
    maxHeight: 430,
  },
  modalScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  readOnlyInfoCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: '#F8FBFC',
    padding: 12,
    gap: 6,
  },
  modalDivider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: 6,
  },
  popupSectionTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
    marginBottom: 4,
  },
  vitalBadgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  vitalBadgeCard: {
    flexGrow: 1,
    flexBasis: 140,
    minWidth: 132,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3,
  },
  vitalBadgeNormal: {
    borderColor: '#D6E2E8',
    backgroundColor: '#FFFFFF',
  },
  vitalBadgeWarning: {
    borderColor: '#F5A623',
    backgroundColor: '#FFF6E5',
  },
  vitalBadgeDanger: {
    borderColor: '#D64545',
    backgroundColor: '#FFF1F1',
  },
  vitalBadgeLabel: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  vitalBadgeValue: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  popupBadgeWrap: {
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  stickyModalFooter: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.card,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: theme.card,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    minHeight: TAB_BAR_BASE_HEIGHT,
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



