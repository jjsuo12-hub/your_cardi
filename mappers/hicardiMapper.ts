import { HicardiAssessmentRecord, HicardiMonitoringOrder, VitalSnapshot } from '../types/appClinicalTypes';
import { RawHicardiDevicePayload } from '../types/rawExternalTypes';

export function mapRawHicardiPayloadToVitalSnapshot(
  patientNumber: string,
  raw: RawHicardiDevicePayload,
): VitalSnapshot {
  return {
    patientNumber,
    measuredAt: raw.measured_at ?? new Date().toISOString(),
    rr: raw.rr ?? 18,
    spo2: raw.spo2 ?? 98,
    oxygen: false,
    sbp: 120,
    hr: raw.hr ?? 80,
    consciousness: 'alert',
    temperature: raw.skin_temp ?? 36.5,
    skinTemperature: raw.skin_temp,
    source: 'hicardi',
  };
}

export function mapAssessmentToHicardiMonitoringOrder(
  assessment: HicardiAssessmentRecord,
): HicardiMonitoringOrder {
  return {
    patientNumber: assessment.patientNumber,
    encounterId: assessment.encounterId,
    targetStatus: assessment.status,
    requestedAt: assessment.assessedAt,
    note: assessment.applicationReason ?? '시연용 평가 기록에서 생성된 의료진 상의용 매핑 요청입니다.',
    source: 'demo',
  };
}
