export type DepartmentCategory =
  | 'transplantVascularSurgery'
  | 'colorectalSurgery'
  | 'pediatricSurgery'
  | 'hepatobiliaryPancreaticSurgery'
  | 'gastrointestinalSurgery'
  | 'endocrineSurgery'
  | 'icuTransferOther';

export type TransplantSubtype = 'liver' | 'kidney';

export type TransferSource =
  | 'ward'
  | 'operatingRoom'
  | 'icu'
  | 'otherDepartmentIcu'
  | 'other';

export type HicardiStatus = 'notApplied' | 'candidate' | 'applied' | 'ended';

export type HicardiIndication = 'icuTransfer' | 'kidneyTransplant' | 'liverTransplant';

export type PatientTargets = {
  hrMin: number;
  hrMax: number;
  spo2Min: number;
  spo2Max: number;
  rrMin: number;
  rrMax: number;
  skinTempMin: number;
  skinTempMax: number;
};

export type WardPatient = {
  id: string;
  emrPatientId: string;
  encounterId?: string;
  displayName: string;
  patientNumber?: string;
  room: string;
  bed?: string;
  departmentCategory: DepartmentCategory;
  transplantSubtype?: TransplantSubtype;
  pod?: number;
  transferSource?: TransferSource;
  applicationReason?: string;
  memo?: string;
  hicardiStatus: HicardiStatus;
  hicardiStartTime?: string;
  battery?: number;
  targets: PatientTargets;
  source: 'demo' | 'emr';
  lastSyncedAt?: string;
  isDemoData: true;
};

export type VitalMetricType = 'HR' | 'SpO2' | 'RR' | 'SkinTemp';

export type SignalQuality = 'good' | 'weak' | 'poor';

export type VitalObservation = {
  id: string;
  patientId: string;
  deviceId?: string;
  metricType: VitalMetricType;
  value: number;
  unit: 'bpm' | '%' | 'breaths/min' | 'C';
  measuredAt: string;
  source: 'demo' | 'hicardi' | 'emr';
};

export type PatientVitalSnapshot = {
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
