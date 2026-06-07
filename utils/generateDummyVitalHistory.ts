export type VitalMetricType = 'hr' | 'spo2' | 'rr' | 'skinTemp';
export type VitalDataSource = 'dummy' | 'real';

export type VitalHistoryPoint = {
  minutesAgo: number;
  label: string;
  value: number;
};

const historyValues: Record<VitalMetricType, number[]> = {
  hr: [88, 90, 92, 91, 95, 98, 96, 94, 97, 101, 99, 96, 93],
  spo2: [98, 98, 97, 97, 96, 95, 94, 95, 96, 97, 97, 98, 98],
  rr: [16, 17, 18, 18, 19, 20, 22, 24, 23, 21, 20, 19, 18],
  skinTemp: [36.1, 36.2, 36.3, 36.5, 36.7, 36.9, 37.1, 37.4, 37.6, 37.8, 37.7, 37.5, 37.3],
};

export function generateDummyVitalHistory(metricType: VitalMetricType, now = new Date()): VitalHistoryPoint[] {
  return historyValues[metricType].map((value, index) => {
    const minutesAgo = 120 - index * 10;
    const time = new Date(now.getTime() - minutesAgo * 60 * 1000);
    return {
      minutesAgo,
      label: time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      value,
    };
  });
}
