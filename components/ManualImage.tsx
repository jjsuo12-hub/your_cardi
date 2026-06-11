import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ManualImageKey, manualImageAspectRatios } from '../data/manualImageAssets';

type Props = {
  imageKey: ManualImageKey;
  source: ImageSourcePropType;
};

const MAX_IMAGE_WIDTH = 640;
const HORIZONTAL_SCREEN_GUTTER = 72;

export function ManualImage({ imageKey, source }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const aspectRatio = manualImageAspectRatios[imageKey];
  const imageWidth = Math.min(Math.max(screenWidth - HORIZONTAL_SCREEN_GUTTER, 0), MAX_IMAGE_WIDTH);

  return (
    <View style={[styles.wrapper, { width: imageWidth, aspectRatio }]}>
      <Image source={source} style={styles.image} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F4F8FA',
    marginBottom: 12,
  },
  image: {
    width: '100%',
    height: '100%',
    alignSelf: 'center',
  },
});
