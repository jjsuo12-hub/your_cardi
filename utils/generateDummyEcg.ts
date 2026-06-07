export type EcgDataSource = 'dummy' | 'real';

export type EcgPoint = {
  timeSec: number;
  valueMv: number;
};

export type DummyEcgSample = {
  points: EcgPoint[];
  heartRate: number;
};

type GenerateDummyEcgParams = {
  startTimeSec: number;
  count: number;
  sampleRate: number;
  previousHeartRate: number;
};

const MIN_HR = 84;
const MAX_HR = 96;

export function generateDummyEcg({
  startTimeSec,
  count,
  sampleRate,
  previousHeartRate,
}: GenerateDummyEcgParams): DummyEcgSample {
  const slowDrift = Math.sin(startTimeSec / 8) * 0.55;
  const randomDrift = (Math.random() - 0.5) * 0.5;
  const heartRate = clamp(previousHeartRate + slowDrift + randomDrift, MIN_HR, MAX_HR);
  const rrIntervalSec = 60 / heartRate;
  const points: EcgPoint[] = [];

  for (let index = 0; index < count; index += 1) {
    const timeSec = startTimeSec + index / sampleRate;
    const phase = positiveModulo(timeSec, rrIntervalSec) / rrIntervalSec;
    const baselineWander = Math.sin(timeSec * Math.PI * 0.45) * 0.025;
    const noise = (Math.random() - 0.5) * 0.04;
    const valueMv = clamp(
      baselineWander +
        noise +
        pqrstWave(phase, 0.16, 0.035, 0.1) +
        pqrstWave(phase, 0.32, 0.012, -0.15) +
        pqrstWave(phase, 0.345, 0.009, 1.0) +
        pqrstWave(phase, 0.372, 0.014, -0.35) +
        pqrstWave(phase, 0.62, 0.07, 0.3),
      -1.5,
      1.5,
    );
    points.push({ timeSec, valueMv });
  }

  return { points, heartRate: Math.round(heartRate) };
}

function pqrstWave(phase: number, center: number, width: number, amplitude: number) {
  const distance = phase - center;
  return amplitude * Math.exp(-(distance * distance) / (2 * width * width));
}

function positiveModulo(value: number, modulo: number) {
  return ((value % modulo) + modulo) % modulo;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
