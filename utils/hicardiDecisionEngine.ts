import { HicardiDecisionResult, HicardiSpecialCriteria, News2Result } from '../types/appClinicalTypes';

function countCriteria(criteria: HicardiSpecialCriteria) {
  return Object.values(criteria).filter(Boolean).length;
}

export function evaluateHicardiDecision(
  news2Result: News2Result,
  specialCriteria: HicardiSpecialCriteria,
  emergency = false,
): HicardiDecisionResult {
  if (emergency) {
    return {
      decision: 'emergencyApply',
      finalLabel: '즉시 의료진 상의 필요',
      description: '응급상황 발생 시 NEWS2 점수와 관계없이 환자 상태를 즉시 확인하고 담당 의료진과 상의합니다.',
      reportRequired: true,
      recommendedStatus: 'candidate',
      nextReassessmentLabel: '응급상황 발생 시: 환자 상태를 즉시 확인하고 담당 의료진과 상의합니다.',
    };
  }

  const specialCriteriaCount = countCriteria(specialCriteria);

  if (news2Result.totalScore >= 7) {
    return {
      decision: 'startHicardi',
      finalLabel: 'HiCardi 적용 상의 필요',
      description: 'NEWS2 7점 이상으로 환자 상태 악화 가능성이 높으므로, 담당 의료진과 HiCardi 적용 여부를 상의합니다.',
      reportRequired: true,
      recommendedStatus: 'candidate',
      nextReassessmentLabel: 'NEWS2 ≥ 7점: 매일 재평가 후 담당 의료진과 적용 유지 여부를 상의합니다.',
    };
  }

  if (news2Result.totalScore >= 5) {
    if (specialCriteriaCount >= 1) {
      return {
        decision: 'recommendHicardi',
        finalLabel: 'HiCardi 적용 상의 권고',
        description: 'NEWS2 5-6점이며 병동 특수 적용 기준에 해당하므로, 상급자 및 담당 의료진과 HiCardi 적용 여부를 상의합니다.',
        reportRequired: true,
        recommendedStatus: 'candidate',
        nextReassessmentLabel: 'NEWS2 5-6점: 지정된 시점에 재평가하고 담당 의료진과 적용 유지 여부를 상의합니다.',
      };
    }
    return {
      decision: 'routineObservation',
      finalLabel: '일반 관찰 유지',
      description: '정기적 NEWS2 측정과 환자 상태 관찰을 유지하며, 상태 변화가 있으면 담당 의료진과 상의합니다.',
      reportRequired: false,
      recommendedStatus: 'maintained',
      nextReassessmentLabel: 'NEWS2 5-6점: 지정된 시점에 재평가하고 담당 의료진과 적용 유지 여부를 상의합니다.',
    };
  }

  if (news2Result.totalScore >= 1) {
    if (specialCriteriaCount >= 2) {
      return {
        decision: 'consultSenior',
        finalLabel: '의료진 상의 필요',
        description: 'NEWS2는 낮지만 병동 특수 적용 기준이 2개 이상 해당하므로, HiCardi 적용 여부를 상급자 및 담당 의료진과 상의합니다.',
        reportRequired: false,
        recommendedStatus: 'candidate',
        nextReassessmentLabel: 'NEWS2 5-6점: 지정된 시점에 재평가하고 담당 의료진과 적용 유지 여부를 상의합니다.',
      };
    }
    return {
      decision: 'routineObservation',
      finalLabel: '일반 관찰 유지',
      description: '정기적 NEWS2 측정과 환자 상태 관찰을 유지합니다. 새로운 이상 소견이 있으면 담당 의료진과 상의합니다.',
      reportRequired: false,
      recommendedStatus: 'maintained',
      nextReassessmentLabel: 'NEWS2 5-6점: 지정된 시점에 재평가하고 담당 의료진과 적용 유지 여부를 상의합니다.',
    };
  }

  return {
    decision: 'considerStop',
    finalLabel: 'HiCardi 중단 여부 상의',
    description: 'HiCardi 적용 중인 환자에서 NEWS2 4점 미만이 유지되는 경우, 담당 의료진과 적용 중단 여부를 상의합니다.',
    reportRequired: false,
    recommendedStatus: 'ended',
    nextReassessmentLabel: 'NEWS2 4점 미만 유지: 담당 의료진과 HiCardi 적용 중단 여부를 상의합니다.',
  };
}
