export type RawEmrPatientRecord = {
  patient_no: string;
  emr_patient_id: string;
  encounter_id: string;
  masked_name: string;
  ward: string;
  room: string;
  bed: string;
  department: string;
  diagnosis_or_operation?: string;
  pod?: number;
  age?: number;
  transfer_from?: string;
  updated_at: string;
};

export type RawEmrVitalRecord = {
  patient_no: string;
  measured_at: string;
  rr?: number;
  spo2?: number;
  oxygen?: boolean;
  sbp?: number;
  hr?: number;
  consciousness?: 'A' | 'C' | 'V' | 'P' | 'U';
  temp?: number;
  skin_temp?: number;
};

export type RawHicardiDevicePayload = {
  device_no?: string;
  qr_code?: string;
  receiver_id?: string;
  battery?: number;
  connection_state?: string;
  measured_at?: string;
  hr?: number;
  rr?: number;
  spo2?: number;
  skin_temp?: number;
  ecg_samples?: number[];
};
