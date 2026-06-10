export type DepartmentCategoryLabel =
  | '이식혈관외과'
  | '소아외과'
  | '간담췌외과'
  | '위장관 외과'
  | '내분비 외과'
  | '기타 / 타과 중환자실 전동';

export type TransferSourceLabel = '병동 입원' | '수술실' | 'ICU' | 'ER' | '타과 ICU' | '기타';

export type ConsciousnessState = 'alert' | 'newConfusionOrAVPU';

export type AppPatient = {
  patientNumber: string;
  emrPatientId: string;
  encounterId: string;
  displayName: string;
  room: string;
  bed?: string;
  departmentCategory: DepartmentCategoryLabel;
  transplantSubtype?: 'liver' | 'kidney';
  pod?: number;
  age?: number;
  transferSource?: TransferSourceLabel;
  recentSurgeryName?: string;
  surgeryDurationMinutes?: number;
  generalAnesthesia?: boolean;
  deviceNumber?: string;
  scannerId?: string;
  currentHicardiStatus: 'notApplied' | 'candidate' | 'mappingPending' | 'monitoring' | 'ended';
  source: 'demo' | 'emr';
  isDemoData: boolean;
};

export type VitalSnapshot = {
  patientNumber: string;
  measuredAt: string;
  rr: number;
  spo2: number;
  oxygen: boolean;
  sbp: number;
  hr: number;
  consciousness: ConsciousnessState;
  temperature: number;
  skinTemperature?: number;
  source: 'demo' | 'emr' | 'hicardi';
};

export type News2Input = {
  rr: number;
  spo2: number;
  usesSupplementalOxygen: boolean;
  temperature: number;
  sbp: number;
  pulse: number;
  consciousness: ConsciousnessState;
  hypercapnicRespiratoryFailure?: boolean;
};

export type News2Band = 'gte7' | 'fiveToSix' | 'oneToFour' | 'lt4';

export type News2Result = {
  totalScore: number;
  itemScores: {
    rr: number;
    spo2: number;
    oxygen: number;
    temperature: number;
    sbp: number;
    pulse: number;
    consciousness: number;
  };
  band: News2Band;
};

export type HicardiSpecialCriteria = {
  icuOrEr: boolean;
  highRiskSurgeryOrTransplant: boolean;
  age65OrOlder: boolean;
};

export type HicardiAssessmentRecord = {
  id: string;
  patientNumber: string;
  emrPatientId: string;
  encounterId: string;
  assessedAt: string;
  news2Score: number;
  news2Band: News2Band;
  specialCriteria: HicardiSpecialCriteria;
  specialCriteriaCount: number;
  decision:
    | 'startHicardi'
    | 'recommendHicardi'
    | 'consultSenior'
    | 'routineObservation'
    | 'considerStop'
    | 'emergencyApply';
  status: 'notApplied' | 'candidate' | 'mappingPending' | 'monitoring' | 'maintained' | 'ended';
  applicationReason?: string;
  nextReassessmentLabel?: string;
  source: 'demo';
};

export type HicardiDecisionResult = {
  decision: HicardiAssessmentRecord['decision'];
  finalLabel: string;
  description: string;
  reportRequired: boolean;
  recommendedStatus: HicardiAssessmentRecord['status'];
  nextReassessmentLabel: string;
};

export type HicardiMonitoringOrder = {
  patientNumber: string;
  encounterId: string;
  targetStatus: HicardiAssessmentRecord['status'];
  requestedAt: string;
  note: string;
  source: 'demo';
};
