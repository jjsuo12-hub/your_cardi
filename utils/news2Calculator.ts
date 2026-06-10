import { News2Band, News2Input, News2Result } from '../types/appClinicalTypes';

// NEWS2 scoring should be verified against the official/local hospital guideline before clinical use.
function getRespiratoryRateScore(rr: number) {
  if (rr <= 8) return 3;
  if (rr <= 11) return 1;
  if (rr <= 20) return 0;
  if (rr <= 24) return 2;
  return 3;
}

function getSpo2Score(spo2: number) {
  if (spo2 <= 91) return 3;
  if (spo2 <= 93) return 2;
  if (spo2 <= 95) return 1;
  return 0;
}

function getTemperatureScore(temperature: number) {
  if (temperature <= 35.0) return 3;
  if (temperature <= 36.0) return 1;
  if (temperature <= 38.0) return 0;
  if (temperature <= 39.0) return 1;
  return 2;
}

function getSystolicBpScore(sbp: number) {
  if (sbp <= 90) return 3;
  if (sbp <= 100) return 2;
  if (sbp <= 110) return 1;
  if (sbp <= 219) return 0;
  return 3;
}

function getPulseScore(pulse: number) {
  if (pulse <= 40) return 3;
  if (pulse <= 50) return 1;
  if (pulse <= 90) return 0;
  if (pulse <= 110) return 1;
  if (pulse <= 130) return 2;
  return 3;
}

function getConsciousnessScore(consciousness: News2Input['consciousness']) {
  return consciousness === 'alert' ? 0 : 3;
}

export function getNews2Band(score: number): News2Band {
  if (score >= 7) return 'gte7';
  if (score >= 5) return 'fiveToSix';
  if (score >= 1) return 'oneToFour';
  return 'lt4';
}

export function calculateNews2(input: News2Input): News2Result {
  const itemScores = {
    rr: getRespiratoryRateScore(input.rr),
    spo2: getSpo2Score(input.spo2),
    oxygen: input.usesSupplementalOxygen ? 2 : 0,
    temperature: getTemperatureScore(input.temperature),
    sbp: getSystolicBpScore(input.sbp),
    pulse: getPulseScore(input.pulse),
    consciousness: getConsciousnessScore(input.consciousness),
  };
  const totalScore = Object.values(itemScores).reduce((sum, value) => sum + value, 0);
  return {
    totalScore,
    itemScores,
    band: getNews2Band(totalScore),
  };
}
