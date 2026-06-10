import { ManualImageKey } from './manualImageAssets';

export type ManualStepSection = {
  title?: string;
  body: string[];
  image?: ManualImageKey;
  warning?: string;
};

export type ManualTabContent = {
  id: string;
  label: string;
  body: string[];
  image?: ManualImageKey;
  warning?: string;
};

export type ManualStep = {
  id: string;
  title: string;
  summary: string;
  sections: ManualStepSection[];
  tabs?: ManualTabContent[];
};

export const manualSteps: ManualStep[] = [
  {
    id: 'overview',
    title: '전체 흐름',
    summary: '하이카디 적용 전체 절차를 한 번에 빠르게 확인합니다.',
    sections: [
      {
        title: '솔루션 구성품',
        body: ['실시간 환자모니터링 솔루션 구성품 예시입니다. 병동 장비 상태와 준비물 유무를 함께 확인합니다.'],
        image: 'step1-components',
      },
    ],
  },
  {
    id: 'step1',
    title: 'Step 1. 솔루션 및 의료기기 준비하기',
    summary: '로그인, 매핑 방식 선택, 충전 상태와 준비물 확인까지 시작 전 준비 단계를 정리합니다.',
    sections: [
      {
        body: [
          '① 스마트병원 웹, PDA, 라이브스튜디오에 전달받은 접속주소와 병동별 공통 계정으로 로그인합니다.',
          '② 매핑은 PC 또는 PDA 중 편한 방법으로 진행할 수 있습니다.',
          '③ 충전이 완료된 연결 대기 상태의 의료기기와 필요한 소모품을 준비합니다.',
        ],
      },
      {
        title: '예시 준비물',
        body: ['하이카디 스마트패치', '하이카디 전극 2개', '노닌 장비', '노닌 배터리 2개', '수신기'],
      },
    ],
  },
  {
    id: 'step2',
    title: 'Step 2. 환자·의료기기·수신기 매핑하기',
    summary: 'PC/PDA를 이용한 매핑 절차를 확인합니다.',
    sections: [],
    tabs: [
      {
        id: 'pc',
        label: 'PC 모드',
        body: [
          '① 스마트병원 웹의 기기매핑관리 화면에서 환자를 확인합니다.',
          '② “+” 버튼을 클릭하여 기기 정보 팝업 창을 엽니다.',
          '③ 기기 정보 팝업에서 “기기선택” 버튼을 클릭합니다.',
          '④ 준비한 의료기기의 QR 번호를 검색한 뒤 선택합니다.',
          '⑤ 매핑된 기기 정보를 확인하고 “매핑하기”를 클릭합니다.',
          '⑥ 매핑 완료 팝업에서 “확인”을 누른 후 환자, 의료기기, 수신기 연결 상태를 최종 점검합니다.',
        ],
        image: 'step2-pc',
      },
      {
        id: 'pda',
        label: 'PDA 모드',
        body: [
          '① App을 실행한 뒤 PDA 오른쪽 상단 버튼으로 환자 바코드를 스캔합니다.',
          '② 생성된 환자 정보를 확인합니다.',
          '③ 준비한 의료기기의 QR 번호를 같은 방법으로 스캔합니다.',
          '④ 인식된 기기와 인식된 스캐너 정보를 확인합니다.',
          '⑤ 활성화된 “매핑” 버튼을 선택합니다.',
          '⑥ 환자, 의료기기, 수신기 연결 상태를 최종 점검합니다.',
        ],
        image: 'step2-pda',
      },
    ],
  },
  {
    id: 'step3',
    title: 'Step 3. 환자에게 의료기기 적용하기',
    summary: '부착 위치와 적용 시 주의사항을 빠르게 확인합니다.',
    sections: [
      {
        title: '하이카디 부착 위치',
        body: [
          '① 왼쪽 가슴 중심선에서 30~45도 각도로 부착합니다.',
          '② Nipple 바로 위에 부착합니다.',
          '③ 가슴이 큰 여성 환자의 경우 가슴 중앙에서 왼쪽으로 위치를 조정하여 피부가 평평한 부위에 부착합니다.',
          '④ 하이카디는 부착 위치에 따라 심전도 파형이 다르게 나타날 수 있으므로 부착 위치를 확인합니다.',
        ],
        image: 'step3-placement',
        warning: '부착 위치가 부정확하면 심전도 파형이 다르게 나타나거나 측정 정보가 원활히 수집되지 않을 수 있습니다.',
      },
    ],
  },
  {
    id: 'step4',
    title: 'Step 4. 생체정보 실시간 관찰하기',
    summary: '스마트병원 웹과 라이브스튜디오에서 확인하는 항목을 구분해 보여줍니다.',
    sections: [],
    tabs: [
      {
        id: 'smart-web',
        label: '스마트병원 웹',
        body: [
          '생체정보 모니터링 페이지 - 병동에서 모니터링 중인 전체 환자의 실시간 건강 상태를 확인할 수 있습니다.',
          '생체정보 모니터링 페이지 - 이동 등으로 통신 상태가 원활하지 않은 경우 비활성화 상태로 나타날 수 있습니다.',
          '병실별 모니터링 페이지 - 선택한 병실 또는 관심 환자군의 상세 생체정보를 확인할 수 있습니다.',
          '병실별 모니터링 페이지 - 확인 가능 항목: 매핑 기기, 기기 배터리 상태, 측정 시각, 심박수, 호흡수, 피부온도 등',
        ],
        image: 'step4-web-monitoring',
      },
      {
        id: 'live-studio',
        label: '라이브스튜디오',
        body: [
          '1. 침상 번호',
          '2. 기기 번호',
          '3. 환자 정보',
          '4. 알림 정보',
          '5. 이벤트 정보',
          '6. 저장된 데이터 정보',
          '7. 실시간 파형 프린트',
          '8. 측정 시간',
          '9. 활동 상태',
          '10. 무선 연결 상태',
          '11. 충전 상태',
          '12. 세팅값 수정',
          '13. 심전도 파형',
          '14. 호흡 파형',
          '15. 심박수',
          '16. 호흡수',
          '17. 피부온도',
        ],
        image: 'step4-live-studio',
      },
    ],
  },
  {
    id: 'step5',
    title: 'Step 5. 매핑 해제 및 모니터링 종료하기',
    summary: 'PC/PDA에서 매핑 해제 후 종료 확인까지의 마지막 단계를 정리합니다.',
    sections: [],
    tabs: [
      {
        id: 'pc',
        label: 'PC 모드',
        body: [
          '① 스마트병원 웹 기기매핑관리 화면에서 대상 환자의 매핑 상태를 확인합니다.',
          '② 매핑 기기 항목의 “X” 표시를 클릭하여 팝업 알림 창을 엽니다.',
          '③ 매핑 해제 “확인”을 선택합니다.',
          '④ 정상적으로 매핑이 해제되었는지 확인합니다.',
        ],
        image: 'step5-pc-unmapping',
      },
      {
        id: 'pda',
        label: 'PDA 모드',
        body: [
          '① App 실행 후 대상 환자 바코드를 인식하여 매핑 상태를 확인합니다.',
          '② 기기 또는 수신기 옆 해제 아이콘을 클릭하여 팝업 알림 창을 엽니다.',
          '③ 매핑 해제 “확인”을 선택합니다.',
          '④ 정상적으로 매핑이 해제되었는지 확인합니다.',
        ],
        image: 'step5-pda-unmapping',
        warning: '모니터링 종료 후에는 환자에게서 의료기기를 안전하게 탈착합니다.',
      },
    ],
  },
];
