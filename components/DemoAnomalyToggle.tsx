import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type DemoAnomalyToggleProps = {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
};

export function DemoAnomalyToggle({ enabled, onToggle }: DemoAnomalyToggleProps) {
  return (
    <View style={styles.card}>
      <View style={styles.textBlock}>
        <Text style={styles.label}>개발용 데모 이상 징후 데이터 생성</Text>
        <Text style={styles.caption}>개발용 데모 기능입니다. 실제 환자 데이터가 아니며 임상 판단에 사용할 수 없습니다.</Text>
      </View>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: enabled }}
        style={[styles.toggleTrack, enabled && styles.toggleTrackOn]}
        onPress={() => onToggle(!enabled)}
      >
        <View style={[styles.toggleThumb, enabled && styles.toggleThumbOn]}>
          <View style={[styles.playIcon, enabled && styles.stopIcon]} />
        </View>
        <Text style={[styles.toggleState, enabled && styles.toggleStateOn]}>{enabled ? 'ON' : 'OFF'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D6E2E8',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  textBlock: {
    flex: 1,
    gap: 4,
  },
  label: {
    color: '#1F2933',
    fontSize: 15,
    fontWeight: '900',
  },
  caption: {
    color: '#52616B',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  toggleTrack: {
    width: 104,
    height: 54,
    borderRadius: 999,
    backgroundColor: '#1E5B8C',
    padding: 6,
    justifyContent: 'center',
  },
  toggleTrackOn: {
    backgroundColor: '#D64545',
  },
  toggleThumb: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: '#2BAE9E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleThumbOn: {
    transform: [{ translateX: 50 }],
    backgroundColor: '#F5A623',
  },
  playIcon: {
    width: 0,
    height: 0,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderLeftWidth: 14,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFFFFF',
    marginLeft: 3,
  },
  stopIcon: {
    width: 15,
    height: 15,
    borderWidth: 0,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginLeft: 0,
  },
  toggleState: {
    position: 'absolute',
    right: 10,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  toggleStateOn: {
    left: 12,
    right: undefined,
  },
});
