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
      finalLabel: '즉시 보고 및 HiCardi 적용 검토',
      description: '응급상황은 기존 적용 기준과 관계없이 즉시 보고가 우선입니다.',
      reportRequired: true,
      recommendedStatus: 'candidate',
      nextReassessmentLabel: '응급상황 종료 후 즉시 재평가',
    };
  }

  const specialCriteriaCount = countCriteria(specialCriteria);

  if (news2Result.totalScore >= 7) {
    return {
      decision: 'startHicardi',
      finalLabel: 'HiCardi 적용 권장',
      description: '환자 상태 악화 위험이 높으므로 담당 진료과에 보고하고 HiCardi 적용을 검토합니다.',
      reportRequired: true,
      recommendedStatus: 'candidate',
      nextReassessmentLabel: '매일 재평가',
    };
  }

  if (news2Result.totalScore >= 5) {
    if (specialCriteriaCount >= 1) {
      return {
        decision: 'recommendHicardi',
        finalLabel: 'HiCardi 적용 권고',
        description: '상급자 또는 담당 진료과 보고 후 HiCardi 적용을 결정합니다.',
        reportRequired: true,
        recommendedStatus: 'candidate',
        nextReassessmentLabel: 'POD 2, POD 7, POD 14 재평가',
      };
    }

    return {
      decision: 'routineObservation',
      finalLabel: '일반 관찰 유지',
      description: '정기적 NEWS2 측정 및 환자 상태 모니터링을 유지합니다.',
      reportRequired: false,
      recommendedStatus: 'maintained',
      nextReassessmentLabel: '정기적 NEWS2 측정 및 환자 상태 모니터링',
    };
  }

  if (news2Result.totalScore >= 1) {
    if (specialCriteriaCount >= 2) {
      return {
        decision: 'consultSenior',
        finalLabel: '상급자와 협의',
        description: 'HiCardi 적용 여부를 상급자와 협의합니다.',
        reportRequired: false,
        recommendedStatus: 'candidate',
        nextReassessmentLabel: 'POD 2, POD 7, POD 14 재평가',
      };
    }

    return {
      decision: 'routineObservation',
      finalLabel: '일반 관찰 유지',
      description: '정기적 NEWS2 측정 및 환자 상태 모니터링을 유지합니다.',
      reportRequired: false,
      recommendedStatus: 'maintained',
      nextReassessmentLabel: '정기적 NEWS2 측정 및 환자 상태 모니터링',
    };
  }

  return {
    decision: 'considerStop',
    finalLabel: 'HiCardi 중단 고려',
    description: '이미 HiCardi 적용 중인 경우, NEWS2 4점 미만 유지 시 중단을 고려합니다.',
    reportRequired: false,
    recommendedStatus: 'ended',
    nextReassessmentLabel: 'NEWS2 4점 미만 유지 시 중단 고려',
  };
}
