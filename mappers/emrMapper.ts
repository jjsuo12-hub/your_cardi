import { AppPatient, News2Input, VitalSnapshot } from '../types/appClinicalTypes';
import { RawEmrPatientRecord, RawEmrVitalRecord } from '../types/rawExternalTypes';

function mapDepartmentCategory(department: string): AppPatient['departmentCategory'] {
  if (department === '이식혈관외과') return '이식혈관외과';
  if (department === '소아외과') return '소아외과';
  if (department === '간담췌외과') return '간담췌외과';
  if (department === '위장관 외과') return '위장관 외과';
  if (department === '내분비 외과') return '내분비 외과';
  return '기타 / 타과 중환자실 전동';
}

function mapTransferSource(transferFrom?: string): AppPatient['transferSource'] {
  if (transferFrom === '병동 입원') return '병동 입원';
  if (transferFrom === '수술실') return '수술실';
  if (transferFrom === 'ICU') return 'ICU';
  if (transferFrom === 'ER') return 'ER';
  if (transferFrom === '타과 ICU') return '타과 ICU';
  return '기타';
}

function mapConsciousness(value?: RawEmrVitalRecord['consciousness']): VitalSnapshot['consciousness'] {
  return value && value !== 'A' ? 'newConfusionOrAVPU' : 'alert';
}

export function mapRawEmrPatientToAppPatient(
  raw: RawEmrPatientRecord,
  options?: {
    transplantSubtype?: AppPatient['transplantSubtype'];
    currentHicardiStatus?: AppPatient['currentHicardiStatus'];
    recentSurgeryName?: string;
    surgeryDurationMinutes?: number;
    generalAnesthesia?: boolean;
    deviceNumber?: string;
    scannerId?: string;
  },
): AppPatient {
  return {
    patientNumber: raw.patient_no,
    emrPatientId: raw.emr_patient_id,
    encounterId: raw.encounter_id,
    displayName: raw.masked_name,
    room: raw.room,
    bed: raw.bed,
    departmentCategory: mapDepartmentCategory(raw.department),
    transplantSubtype: options?.transplantSubtype,
    pod: raw.pod,
    age: raw.age,
    transferSource: mapTransferSource(raw.transfer_from),
    recentSurgeryName: options?.recentSurgeryName ?? raw.diagnosis_or_operation,
    surgeryDurationMinutes: options?.surgeryDurationMinutes,
    generalAnesthesia: options?.generalAnesthesia,
    deviceNumber: options?.deviceNumber,
    scannerId: options?.scannerId,
    currentHicardiStatus: options?.currentHicardiStatus ?? 'notApplied',
    source: 'demo',
    isDemoData: true,
  };
}

export function mapRawEmrVitalsToVitalSnapshot(raw: RawEmrVitalRecord): VitalSnapshot {
  return {
    patientNumber: raw.patient_no,
    measuredAt: raw.measured_at,
    rr: raw.rr ?? 18,
    spo2: raw.spo2 ?? 98,
    oxygen: Boolean(raw.oxygen),
    sbp: raw.sbp ?? 120,
    hr: raw.hr ?? 80,
    consciousness: mapConsciousness(raw.consciousness),
    temperature: raw.temp ?? raw.skin_temp ?? 36.5,
    skinTemperature: raw.skin_temp,
    source: 'demo',
  };
}

export function mapVitalSnapshotToNews2Input(vital: VitalSnapshot): News2Input {
  return {
    rr: vital.rr,
    spo2: vital.spo2,
    usesSupplementalOxygen: vital.oxygen,
    temperature: vital.temperature,
    sbp: vital.sbp,
    pulse: vital.hr,
    consciousness: vital.consciousness,
    hypercapnicRespiratoryFailure: false,
  };
}
