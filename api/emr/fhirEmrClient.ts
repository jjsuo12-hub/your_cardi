import { EmrClient } from './emrClient';

function notEnabled(): never {
  throw new Error('FHIR EMR integration is not enabled. This student prototype uses demo data only.');
}

export const fhirEmrClient: EmrClient = {
  async getWardPatients() {
    return notEnabled();
  },
  async getPatientVitals() {
    return notEnabled();
  },
  async getPatientVitalHistory() {
    return notEnabled();
  },
};
