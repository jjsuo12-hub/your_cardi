import { PatientVitalSnapshot, VitalMetricType, VitalObservation, WardPatient } from '../../types/emrTypes';

export interface EmrClient {
  getWardPatients(): Promise<WardPatient[]>;
  getPatientVitals(patientId: string): Promise<PatientVitalSnapshot | null>;
  getPatientVitalHistory(patientId: string, metricType: VitalMetricType): Promise<VitalObservation[]>;
}
