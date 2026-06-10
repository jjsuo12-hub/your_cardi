import { demoEmrPatientSeeds } from '../../data/demoEmrPatients';
import { RawHicardiDevicePayload } from '../../types/rawExternalTypes';

function createWaveform(offset: number) {
  const beat = [50, 51, 53, 57, 51, 49, 45, 40, 88, 22, 60, 52, 51, 53, 57, 60, 56, 53, 51, 50];
  return Array.from({ length: 88 }, (_, index) => beat[index % beat.length] + Math.sin((index + offset) / 3) * 1.1);
}

export const demoHicardiClient = {
  async getLatestPayloadByPatientNumber(patientNumber: string): Promise<RawHicardiDevicePayload | null> {
    const patient = demoEmrPatientSeeds.find((item) => item.patientNumber === patientNumber);
    if (!patient) return null;
    return {
      device_no: `demo-device-${patientNumber.slice(-3)}`,
      qr_code: `DEMO-QR-${patientNumber}`,
      receiver_id: `demo-rx-${patientNumber.slice(-2)}`,
      battery: 70 + Number(patientNumber.slice(-1)),
      connection_state: patient.currentHicardiStatus === 'monitoring' ? 'connected' : 'standby',
      measured_at: patient.recentVitals.measuredAt,
      hr: patient.recentVitals.hr,
      rr: patient.recentVitals.rr,
      spo2: patient.recentVitals.spo2,
      skin_temp: patient.recentVitals.skinTemp,
      ecg_samples: createWaveform(Number(patientNumber.slice(-1))),
    };
  },
};
