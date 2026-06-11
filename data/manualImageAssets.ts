import { ImageSourcePropType } from 'react-native';

export type ManualImageKey =
  | 'step1-components'
  | 'step2-pc'
  | 'step2-pda'
  | 'step3-placement'
  | 'step4-web-monitoring'
  | 'step4-live-studio'
  | 'step5-pc-unmapping'
  | 'step5-pda-unmapping';

// 이미지 추가 예정: 파일이 없는 경우 undefined로 두고 UI에서 조건부 렌더링합니다.
export const manualImageAssets: Partial<Record<ManualImageKey, ImageSourcePropType>> = {
  'step1-components': require('../assets/manual/step1-components.png'),
  'step2-pc': require('../assets/manual/step2-pc.png'),
  'step2-pda': require('../assets/manual/step2-pda.png'),
  'step3-placement': require('../assets/manual/step3-placement.png'),
  'step4-web-monitoring': require('../assets/manual/step4-web-monitoring.png'),
  'step4-live-studio': require('../assets/manual/step4-live-studio.png'),
  'step5-pc-unmapping': require('../assets/manual/step5-pc-unmapping.png'),
};

export const manualImageAspectRatios: Record<ManualImageKey, number> = {
  'step1-components': 4 / 3,
  'step2-pc': 16 / 10,
  'step2-pda': 9 / 16,
  'step3-placement': 4 / 3,
  'step4-web-monitoring': 16 / 10,
  'step4-live-studio': 16 / 10,
  'step5-pc-unmapping': 16 / 10,
  'step5-pda-unmapping': 9 / 16,
};
