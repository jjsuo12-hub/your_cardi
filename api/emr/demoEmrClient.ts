import { demoWardPatientTemplates, demoWardPatients } from '../../data/demoWardPatients';
import { demoEmrPatientSeeds, demoRawEmrPatients, demoRawEmrVitals } from '../../data/demoEmrPatients';
import { mapRawEmrPatientToAppPatient, mapRawEmrVitalsToVitalSnapshot } from '../../mappers/emrMapper';
import { AppPatient, VitalSnapshot } from '../../types/appClinicalTypes';
import { RawEmrPatientRecord, RawEmrVitalRecord } from '../../types/rawExternalTypes';
import { EmrClient } from './emrClient';
import {
  PatientVitalSnapshot,
  SignalQuality,
  VitalMetricType,
  VitalObservation,
  WardPatient,
} from '../../types/emrTypes';

const seedVitals: Record<string, PatientVitalSnapshot> = {
  p1: createPatientVitalSnapshot('p1', 78, 18, 98, 36.8, 'good'),
  p2: createPatientVitalSnapshot('p2', 88, 17, 98, 36.4, 'good'),
  p3: createPatientVitalSnapshot('p3', 84, 18, 97, 36.5, 'good'),
  'p4-template': createPatientVitalSnapshot('p4-template', 82, 18, 98, 36.7, 'good'),
  'p5-template': createPatientVitalSnapshot('p5-template', 86, 17, 97, 36.9, 'good'),
};

export function getDemoWardPatientsSnapshot() {
  return demoWardPatients.map(cloneWardPatient);
}

export function getDemoWardPatientTemplatesSnapshot() {
  return demoWardPatientTemplates.map(cloneWardPatient);
}

export function getDemoVitalsSnapshotMap() {
  return Object.fromEntries(Object.entries(seedVitals).map(([id, vital]) => [id, cloneVitalSnapshot(vital)]));
}

export function getDemoRawEmrPatientsSnapshot() {
  return demoRawEmrPatients.map((item) => ({ ...item }));
}

export function getDemoRawEmrVitalsSnapshot() {
  return demoRawEmrVitals.map((item) => ({ ...item }));
}

export function findDemoRawEmrPatientByNumber(patientNumber: string): RawEmrPatientRecord | null {
  const patient = demoRawEmrPatients.find((item) => item.patient_no === patientNumber);
  return patient ? { ...patient } : null;
}

export function findDemoRawEmrVitalsByPatientNumber(patientNumber: string): RawEmrVitalRecord | null {
  const vital = demoRawEmrVitals.find((item) => item.patient_no === patientNumber);
  return vital ? { ...vital } : null;
}

export async function searchDemoEmrPatientByNumber(patientNumber: string): Promise<{
  patient: AppPatient;
  vital: VitalSnapshot;
  meta: (typeof demoEmrPatientSeeds)[number];
} | null> {
  const rawPatient = findDemoRawEmrPatientByNumber(patientNumber);
  const rawVital = findDemoRawEmrVitalsByPatientNumber(patientNumber);
  const meta = demoEmrPatientSeeds.find((item) => item.patientNumber === patientNumber);
  if (!rawPatient || !rawVital || !meta) return null;
  return {
    patient: mapRawEmrPatientToAppPatient(rawPatient, {
      transplantSubtype: meta.transplantSubtype,
      currentHicardiStatus: meta.currentHicardiStatus,
      recentSurgeryName: meta.recentSurgeryName,
      surgeryDurationMinutes: meta.surgeryDurationMinutes,
      generalAnesthesia: meta.generalAnesthesia,
      deviceNumber: meta.deviceNumber,
      scannerId: meta.scannerId,
    }),
    vital: mapRawEmrVitalsToVitalSnapshot(rawVital),
    meta: { ...meta },
  };
}

export function createPatientVitalSnapshot(
  patientId: string,
  hr: number,
  rr: number,
  spo2: number,
  temperature: number,
  signalQuality: SignalQuality,
): PatientVitalSnapshot {
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

function cloneWardPatient(patient: WardPatient): WardPatient {
  return {
    ...patient,
    targets: { ...patient.targets },
  };
}

function cloneVitalSnapshot(vital: PatientVitalSnapshot): PatientVitalSnapshot {
  return {
    ...vital,
    ekgWaveform: [...vital.ekgWaveform],
    hrTrend: [...vital.hrTrend],
    rrTrend: [...vital.rrTrend],
    spo2Trend: [...vital.spo2Trend],
    temperatureTrend: [...vital.temperatureTrend],
  };
}

function getVitalUnit(metricType: VitalMetricType): VitalObservation['unit'] {
  if (metricType === 'HR') return 'bpm';
  if (metricType === 'SpO2') return '%';
  if (metricType === 'RR') return 'breaths/min';
  return 'C';
}

function getMetricValues(snapshot: PatientVitalSnapshot, metricType: VitalMetricType) {
  if (metricType === 'HR') return snapshot.hrTrend;
  if (metricType === 'SpO2') return snapshot.spo2Trend;
  if (metricType === 'RR') return snapshot.rrTrend;
  return snapshot.temperatureTrend;
}

function createVitalObservations(snapshot: PatientVitalSnapshot, metricType: VitalMetricType): VitalObservation[] {
  const values = getMetricValues(snapshot, metricType);
  const unit = getVitalUnit(metricType);
  const now = Date.now();
  return values.map((value, index) => ({
    id: `${snapshot.patientId}-${metricType}-${index}`,
    patientId: snapshot.patientId,
    metricType,
    value: Number(value.toFixed(1)),
    unit,
    measuredAt: new Date(now - (values.length - 1 - index) * 5 * 60 * 1000).toISOString(),
    source: 'demo',
  }));
}

function createFiveMinuteHistory(base: number, amplitude: number, period: number) {
  return Array.from({ length: 25 }, (_, index) => base + Math.sin(index / period) * amplitude + randomStep(amplitude * 0.35));
}

function createEkgWaveform() {
  const beat = [50, 51, 53, 56, 52, 50, 48, 44, 88, 20, 60, 52, 51, 54, 58, 61, 59, 55, 52, 50, 50, 50];
  return Array.from({ length: 88 }, (_, index) => beat[index % beat.length] + Math.sin(index / 3) * 1.4);
}

function randomStep(size: number) {
  return (Math.random() - 0.5) * size;
}

export const demoEmrClient: EmrClient = {
  async getWardPatients() {
    return getDemoWardPatientsSnapshot();
  },
  async getPatientVitals(patientId: string) {
    const snapshot = seedVitals[patientId];
    return snapshot ? cloneVitalSnapshot(snapshot) : null;
  },
  async getPatientVitalHistory(patientId: string, metricType: VitalMetricType) {
    const snapshot = seedVitals[patientId];
    return snapshot ? createVitalObservations(snapshot, metricType) : [];
  },
};
