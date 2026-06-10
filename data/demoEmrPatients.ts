import { DepartmentCategoryLabel, TransferSourceLabel } from '../types/appClinicalTypes';
import { RawEmrPatientRecord, RawEmrVitalRecord } from '../types/rawExternalTypes';

export type DemoEmrPatientSeed = {
  patientNumber: string;
  emrPatientId: string;
  encounterId: string;
  displayName: string;
  room: string;
  bed: string;
  departmentCategory: DepartmentCategoryLabel;
  transplantSubtype?: 'liver' | 'kidney';
  pod: number;
  transferSource: TransferSourceLabel;
  age: number;
  recentSurgeryName: string;
  surgeryDurationMinutes: number;
  generalAnesthesia: boolean;
  deviceNumber: string;
  scannerId: string;
  recentVitals: {
    measuredAt: string;
    rr: number;
    spo2: number;
    oxygen: boolean;
    sbp: number;
    hr: number;
    consciousness: 'A' | 'C' | 'V' | 'P' | 'U';
    temp: number;
    skinTemp: number;
  };
  currentHicardiStatus: 'notApplied' | 'candidate' | 'mappingPending' | 'monitoring' | 'ended';
  source: 'demo';
  isDemoData: true;
};

export const demoEmrPatientSeeds: DemoEmrPatientSeed[] = [
  {
    patientNumber: 'P-240601',
    emrPatientId: 'demo-emr-001',
    encounterId: 'demo-enc-001',
    displayName: '김○○',
    room: '8A-601',
    bed: '1',
    departmentCategory: '이식혈관외과',
    transplantSubtype: 'kidney',
    pod: 2,
    transferSource: 'ICU',
    age: 67,
    recentSurgeryName: 'KT',
    surgeryDurationMinutes: 215,
    generalAnesthesia: true,
    deviceNumber: '48103',
    scannerId: 'sc-73105',
    recentVitals: {
      measuredAt: '2026-06-10T09:18:00+09:00',
      rr: 22,
      spo2: 95,
      oxygen: true,
      sbp: 108,
      hr: 112,
      consciousness: 'A',
      temp: 37.8,
      skinTemp: 36.9,
    },
    currentHicardiStatus: 'candidate',
    source: 'demo',
    isDemoData: true,
  },
  {
    patientNumber: 'P-240602',
    emrPatientId: 'demo-emr-002',
    encounterId: 'demo-enc-002',
    displayName: '박○○',
    room: '8A-602',
    bed: '2',
    departmentCategory: '간담췌외과',
    pod: 1,
    transferSource: '수술실',
    age: 72,
    recentSurgeryName: 'PPPD',
    surgeryDurationMinutes: 265,
    generalAnesthesia: true,
    deviceNumber: '48291',
    scannerId: 'sc-73916',
    recentVitals: {
      measuredAt: '2026-06-10T09:26:00+09:00',
      rr: 19,
      spo2: 97,
      oxygen: false,
      sbp: 118,
      hr: 94,
      consciousness: 'A',
      temp: 37.1,
      skinTemp: 36.6,
    },
    currentHicardiStatus: 'notApplied',
    source: 'demo',
    isDemoData: true,
  },
  {
    patientNumber: 'P-240603',
    emrPatientId: 'demo-emr-003',
    encounterId: 'demo-enc-003',
    displayName: '이○○',
    room: '8A-603',
    bed: '1',
    departmentCategory: '위장관 외과',
    pod: 5,
    transferSource: '병동 입원',
    age: 58,
    recentSurgeryName: 'colectomy',
    surgeryDurationMinutes: 165,
    generalAnesthesia: true,
    deviceNumber: '48572',
    scannerId: 'sc-74128',
    recentVitals: {
      measuredAt: '2026-06-10T09:11:00+09:00',
      rr: 24,
      spo2: 93,
      oxygen: true,
      sbp: 98,
      hr: 126,
      consciousness: 'V',
      temp: 38.3,
      skinTemp: 37.4,
    },
    currentHicardiStatus: 'mappingPending',
    source: 'demo',
    isDemoData: true,
  },
  {
    patientNumber: 'P-240604',
    emrPatientId: 'demo-emr-004',
    encounterId: 'demo-enc-004',
    displayName: '최○○',
    room: '8A-604',
    bed: '2',
    departmentCategory: '내분비 외과',
    pod: 8,
    transferSource: '병동 입원',
    age: 49,
    recentSurgeryName: 'thyroidectomy observation',
    surgeryDurationMinutes: 75,
    generalAnesthesia: true,
    deviceNumber: '48964',
    scannerId: 'sc-74537',
    recentVitals: {
      measuredAt: '2026-06-10T08:58:00+09:00',
      rr: 16,
      spo2: 98,
      oxygen: false,
      sbp: 124,
      hr: 78,
      consciousness: 'A',
      temp: 36.6,
      skinTemp: 36.2,
    },
    currentHicardiStatus: 'notApplied',
    source: 'demo',
    isDemoData: true,
  },
];

export const demoRawEmrPatients: RawEmrPatientRecord[] = demoEmrPatientSeeds.map((patient) => ({
  patient_no: patient.patientNumber,
  emr_patient_id: patient.emrPatientId,
  encounter_id: patient.encounterId,
  masked_name: patient.displayName,
  ward: '8A',
  room: patient.room,
  bed: patient.bed,
  department: patient.departmentCategory,
  diagnosis_or_operation: patient.recentSurgeryName,
  pod: patient.pod,
  age: patient.age,
  transfer_from: patient.transferSource,
  updated_at: patient.recentVitals.measuredAt,
}));

export const demoRawEmrVitals: RawEmrVitalRecord[] = demoEmrPatientSeeds.map((patient) => ({
  patient_no: patient.patientNumber,
  measured_at: patient.recentVitals.measuredAt,
  rr: patient.recentVitals.rr,
  spo2: patient.recentVitals.spo2,
  oxygen: patient.recentVitals.oxygen,
  sbp: patient.recentVitals.sbp,
  hr: patient.recentVitals.hr,
  consciousness: patient.recentVitals.consciousness,
  temp: patient.recentVitals.temp,
  skin_temp: patient.recentVitals.skinTemp,
}));
