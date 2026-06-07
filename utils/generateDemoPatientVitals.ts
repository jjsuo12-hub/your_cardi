export type DemoAnomalyType = 'hrRise' | 'spo2Drop' | 'rrRise' | 'skinTempRise';

export type DemoPatientVitals = {
  hr: number;
  rr: number;
  spo2: number;
  skinTemperature: number;
  signalQuality: 'good' | 'weak' | 'poor';
  status: 'stable' | 'caution' | 'checkRequired';
  latestAlert: string;
};

export function generateNormalPatientVitals(): DemoPatientVitals {
  return {
    hr: randomInt(78, 96),
    spo2: randomInt(96, 99),
    rr: randomInt(14, 20),
    skinTemperature: randomFloat(35.8, 36.8),
    signalQuality: 'good',
    status: 'stable',
    latestAlert: 'Stable demo',
  };
}

export function generateAnomalyPatientVitals(anomalyType: DemoAnomalyType): DemoPatientVitals {
  if (anomalyType === 'hrRise') {
    return {
      hr: randomInt(112, 128),
      spo2: randomInt(95, 98),
      rr: randomInt(20, 24),
      skinTemperature: randomFloat(36.8, 37.5),
      signalQuality: 'weak',
      status: 'caution',
      latestAlert: 'Watch demo: HR 증가 예시',
    };
  }
  if (anomalyType === 'spo2Drop') {
    return {
      hr: randomInt(96, 112),
      spo2: randomInt(90, 94),
      rr: randomInt(22, 28),
      skinTemperature: randomFloat(36.5, 37.4),
      signalQuality: 'poor',
      status: 'checkRequired',
      latestAlert: 'Alert demo: SpO2 저하 예시',
    };
  }
  if (anomalyType === 'rrRise') {
    const alert = Math.random() > 0.5;
    return {
      hr: randomInt(96, 116),
      spo2: randomInt(93, 96),
      rr: randomInt(25, 32),
      skinTemperature: randomFloat(36.6, 37.6),
      signalQuality: alert ? 'poor' : 'weak',
      status: alert ? 'checkRequired' : 'caution',
      latestAlert: `${alert ? 'Alert demo' : 'Watch demo'}: RR 증가 예시`,
    };
  }
  return {
    hr: randomInt(96, 118),
    spo2: randomInt(95, 98),
    rr: randomInt(20, 26),
    skinTemperature: randomFloat(37.6, 38.4),
    signalQuality: 'weak',
    status: 'caution',
    latestAlert: 'Watch demo: 피부온도 상승 예시',
  };
}

export function pickRandomPatients<T extends { id: string }>(patients: T[], count: number) {
  return [...patients].sort(() => Math.random() - 0.5).slice(0, Math.min(count, patients.length));
}

export function pickRandomAnomalyType(): DemoAnomalyType {
  const types: DemoAnomalyType[] = ['hrRise', 'spo2Drop', 'rrRise', 'skinTempRise'];
  return types[Math.floor(Math.random() * types.length)];
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}
