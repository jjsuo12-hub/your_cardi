import { VitalMetricType } from '../../types/emrTypes';
import { demoEmrClient } from './demoEmrClient';
import { fhirEmrClient } from './fhirEmrClient';

export const DATA_SOURCE_MODE = process.env.EXPO_PUBLIC_DATA_SOURCE === 'fhir' ? 'fhir' : 'demo';

const emrClient = DATA_SOURCE_MODE === 'fhir' ? fhirEmrClient : demoEmrClient;

export const emrRepository = {
  getWardPatients: () => emrClient.getWardPatients(),
  getPatientVitals: (patientId: string) => emrClient.getPatientVitals(patientId),
  getPatientVitalHistory: (patientId: string, metricType: VitalMetricType) => emrClient.getPatientVitalHistory(patientId, metricType),
};

export const CURRENT_DATA_SOURCE_LABEL = DATA_SOURCE_MODE.toUpperCase();
